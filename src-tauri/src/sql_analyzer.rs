use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use aho_corasick::{AhoCorasick, MatchKind};
use once_cell::sync::Lazy;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CteInfo {
    pub name: String,
    pub is_recursive: bool,
    pub depth: u32,
    pub start_pos: usize,
    pub end_pos: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableUsage {
    pub name: String,
    pub alias: String,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfJoinChain {
    pub table_name: String,
    pub aliases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub func: String,
    pub pos: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlAnalysis {
    pub ctes: Vec<CteInfo>,
    pub self_joins: Vec<SelfJoinChain>,
    pub tables: Vec<TableUsage>,
    pub window_funcs: Vec<WindowInfo>,
    pub complexity_score: u32,
    pub suggestions: Vec<String>,
    pub highlighted_positions: Vec<(usize, usize, String)>,
}

// Pass 1 Keywords
static SQL_KEYWORDS: &[&str] = &[
    "WITH", "RECURSIVE", "AS", "SELECT", "FROM", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "ON", 
    "UNION", "ALL", "ROW_NUMBER", "RANK", "DENSE_RANK", "NTILE", "LAG", "LEAD", "FIRST_VALUE", 
    "PERCENT_RANK", "CUME_DIST", "OVER", "PARTITION", "ORDER", "BY", "GROUP", "HAVING", "WHERE", 
    "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END", "(", ")"
];

static AC_SQL: Lazy<AhoCorasick> = Lazy::new(|| {
    AhoCorasick::builder()
        .ascii_case_insensitive(true)
        .match_kind(MatchKind::LeftmostFirst)
        .build(SQL_KEYWORDS)
        .expect("Failed to build SQL AhoCorasick")
});

pub fn analyze_sql(query: &str) -> SqlAnalysis {
    // Pass 0: Preprocessing
    let clean_query = preprocess_sql(query);
    
    // Pass 1: Keyword Matching
    let matches: Vec<(usize, &str)> = AC_SQL
        .find_iter(&clean_query)
        .map(|mat| (mat.start(), SQL_KEYWORDS[mat.pattern().as_usize()]))
        .collect();

    let mut ctes = Vec::new();
    let mut table_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut window_funcs = Vec::new();
    let mut highlights = Vec::new();
    let mut max_depth = 0;
    let mut current_depth = 0;
    let mut suggestions = Vec::new();
    let mut paren_stack = Vec::new();
    
    // Pass 2: CTE & Nesting
    let mut i = 0;
    while i < matches.len() {
        let (pos, kw) = matches[i];
        
        match kw {
            "WITH" => {
                highlights.push((pos, pos + kw.len(), "keyword".to_string()));
                let mut j = i + 1;
                while j < matches.len() {
                    let (p2, k2) = matches[j];
                    if k2 == "SELECT" { break; }
                    if k2 == "AS" && j > 0 {
                        let prev_match = matches[j-1];
                        let prev_pos = prev_match.0 + prev_match.1.len();
                        let cte_name = clean_query[prev_pos..p2].trim().to_string();
                        if !cte_name.is_empty() && !SQL_KEYWORDS.contains(&cte_name.to_uppercase().as_str()) {
                            ctes.push(CteInfo {
                                name: cte_name.clone(),
                                is_recursive: false,
                                depth: current_depth,
                                start_pos: p2,
                                end_pos: 0,
                            });
                            highlights.push((prev_pos, p2, "cte".to_string()));
                        }
                    }
                    j += 1;
                }
                i = j - 1;
            }
            "(" => {
                current_depth += 1;
                max_depth = max_depth.max(current_depth);
                paren_stack.push(pos);
                highlights.push((pos, pos + kw.len(), "keyword".to_string()));
            }
            ")" => {
                if current_depth > 0 {
                    current_depth -= 1;
                    paren_stack.pop();
                }
                highlights.push((pos, pos + kw.len(), "keyword".to_string()));
            }
            "ROW_NUMBER" | "RANK" | "LAG" | "LEAD" => {
                window_funcs.push(WindowInfo {
                    func: kw.to_string(),
                    pos,
                });
                highlights.push((pos, pos + kw.len(), "window".to_string()));
            }
            "FROM" | "JOIN" => {
                highlights.push((pos, pos + kw.len(), "keyword".to_string()));
                extract_table_at(&clean_query, &matches, i, &mut table_map, &mut highlights);
            }
            "UNION" => {
                highlights.push((pos, pos + kw.len(), "keyword".to_string()));
                if i + 1 < matches.len() && matches[i+1].1 == "ALL" {
                    suggestions.push("Detect UNION ALL - check for recursion in CTE.".to_string());
                }
            }
            _ => {
                highlights.push((pos, pos + kw.len(), "keyword".to_string()));
            }
        }
        i += 1;
    }

    // Pass 3: Self-Join Detection
    let mut self_joins = Vec::new();
    for (table, aliases) in &table_map {
        let unique_aliases: HashSet<String> = aliases.iter().cloned().collect();
        if unique_aliases.len() > 1 {
            self_joins.push(SelfJoinChain {
                table_name: table.clone(),
                aliases: aliases.clone(),
            });
            suggestions.push(format!("SELF-JOIN DETECTED: Table '{}' is used multiple times ({:?}).", table, aliases));
        }
    }

    let tables: Vec<TableUsage> = table_map.iter().flat_map(|(name, aliases)| {
        aliases.iter().map(|a| TableUsage {
            name: name.clone(),
            alias: a.clone(),
            count: aliases.len() as u32,
        }).collect::<Vec<_>>()
    }).collect();

    // Pass 4: Scoring
    let complexity_score = calculate_score(
        ctes.len(),
        0, // recursive
        self_joins.len(),
        window_funcs.len(),
        max_depth,
        0, // subqueries
    );

    if complexity_score > 120 {
        suggestions.push("⚠️ HIGH COMPLEXITY: Consider refactoring this query.".to_string());
    }

    SqlAnalysis {
        ctes,
        self_joins,
        tables,
        window_funcs,
        complexity_score,
        suggestions,
        highlighted_positions: highlights,
    }
}

fn preprocess_sql(query: &str) -> String {
    let mut result = String::with_capacity(query.len());
    let mut in_line_comment = false;
    let mut in_block_comment = false;
    let mut in_string = false;
    let mut quote_char = ' ';
    
    let mut chars = query.chars().peekable();

    while let Some(c) = chars.next() {
        if in_line_comment {
            if c == '\n' { in_line_comment = false; result.push(' '); }
            continue;
        }
        if in_block_comment {
            if c == '*' && chars.peek() == Some(&'/') {
                chars.next();
                in_block_comment = false;
                result.push(' ');
            }
            continue;
        }
        if in_string {
            result.push(c);
            if c == quote_char {
                // Handle escaped quotes (e.g., '')
                if chars.peek() == Some(&quote_char) {
                    result.push(chars.next().unwrap());
                } else {
                    in_string = false;
                }
            }
            continue;
        }

        if c == '\'' || c == '"' {
            in_string = true;
            quote_char = c;
            result.push(c);
            continue;
        }

        if c == '-' && chars.peek() == Some(&'-') {
            in_line_comment = true;
            continue;
        }
        if c == '/' && chars.peek() == Some(&'*') {
            in_block_comment = true;
            continue;
        }
        
        if c.is_whitespace() {
            if !result.ends_with(' ') { result.push(' '); }
        } else {
            result.push(c);
        }
    }
    result
}

fn extract_table_at(
    query: &str, 
    matches: &[(usize, &str)], 
    idx: usize,
    table_map: &mut HashMap<String, Vec<String>>,
    highlights: &mut Vec<(usize, usize, String)>
) {
    let (pos, kw) = matches[idx];
    let start = pos + kw.len();
    let end = matches.get(idx + 1).map(|m| m.0).unwrap_or(query.len());
    let snippet = &query[start..end];
    let trimmed = snippet.trim();
    
    if trimmed.is_empty() || trimmed.starts_with('(') { return; }

    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if !parts.is_empty() {
        let table = parts[0].trim_matches(|c| c == '[' || c == ']' || c == '`' || c == ',');
        if SQL_KEYWORDS.contains(&table.to_uppercase().as_str()) { return; }

        let alias = if parts.len() > 1 && parts[1].to_uppercase() != "AS" && !SQL_KEYWORDS.contains(&parts[1].to_uppercase().as_str()) {
            Some(parts[1].trim_matches(','))
        } else if parts.len() > 2 && parts[1].to_uppercase() == "AS" && !SQL_KEYWORDS.contains(&parts[2].to_uppercase().as_str()) {
            Some(parts[2].trim_matches(','))
        } else {
            None
        };
        
        let table_name = table.to_string();
        let alias_name = alias.unwrap_or(table).to_string();
        
        table_map.entry(table_name.clone())
            .or_default()
            .push(alias_name.clone());

        // Highlight table and alias
        if let Some(t_start_rel) = snippet.find(table) {
            let t_start = start + t_start_rel;
            highlights.push((t_start, t_start + table.len(), "table".to_string()));
            
            if let Some(a) = alias {
                if let Some(a_start_rel) = snippet[t_start_rel + table.len()..].find(a) {
                    let a_start = t_start + table.len() + a_start_rel;
                    highlights.push((a_start, a_start + a.len(), "alias".to_string()));
                }
            }
        }
    }
}

fn calculate_score(ctes: usize, recursive: usize, self_joins: usize, windows: usize, depth: u32, subqueries: usize) -> u32 {
    (ctes as u32 * 15) +
    (recursive as u32 * 30) +
    (self_joins as u32 * 25) +
    (windows as u32 * 10) +
    (depth * 20) +
    (subqueries as u32 * 12)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_self_join_detection() {
        let sql = "SELECT * FROM USERS U1 JOIN USERS U2 ON U1.ID = U2.ID";
        let analysis = analyze_sql(sql);
        assert_eq!(analysis.self_joins.len(), 1);
        assert_eq!(analysis.self_joins[0].table_name, "USERS");
        assert!(analysis.self_joins[0].aliases.contains(&"U1".to_string()));
        assert!(analysis.self_joins[0].aliases.contains(&"U2".to_string()));
    }

    #[test]
    fn test_cte_detection() {
        let sql = "WITH MGR AS (SELECT * FROM EMP) SELECT * FROM MGR";
        let analysis = analyze_sql(sql);
        assert_eq!(analysis.ctes.len(), 1);
        assert_eq!(analysis.ctes[0].name, "MGR");
    }

    #[test]
    fn test_complexity_score() {
        let sql = "SELECT ROW_NUMBER() OVER(ORDER BY ID) FROM USERS";
        let analysis = analyze_sql(sql);
        assert!(analysis.complexity_score >= 10);
        assert_eq!(analysis.window_funcs.len(), 1);
    }
    
    #[test]
    fn test_preprocess_strings() {
        let sql = "SELECT '-- not a comment' FROM DUAL";
        let cleaned = preprocess_sql(sql);
        assert!(cleaned.contains("-- not a comment"));
    }
}
