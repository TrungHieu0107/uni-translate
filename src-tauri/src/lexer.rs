/// SQL Token types
#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    // Keywords
    Keyword(String),     // SELECT, FROM, WHERE, JOIN, etc.
    // Identifiers and literals
    Ident(String),       // table names, column names
    Number(String),      // numeric literals
    StringLit(String),   // 'string literals'
    // Operators and punctuation
    Comma,               // ,
    Dot,                 // .
    LParen,              // (
    RParen,              // )
    Semicolon,           // ;
    Operator(String),    // =, <>, !=, >=, <=, >, <, +, -, *, /, %, =
    // Comments
    LineComment(String), // -- comment
    // Whitespace (ignored mostly, but preserved for structure hints)
    Newline,
    Whitespace,
}

/// SQL keywords (uppercase for matching)
const KEYWORDS: &[&str] = &[
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT",
    "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS",
    "ON", "AS", "IN", "IS", "NULL", "BETWEEN", "LIKE", "EXISTS",
    "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
    "UNION", "ALL", "INTERSECT", "EXCEPT",
    "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "CREATE", "TABLE", "ALTER", "DROP", "INDEX",
    "WITH", "RECURSIVE",
    "CASE", "WHEN", "THEN", "ELSE", "END",
    "DISTINCT", "TOP", "PERCENT",
    "CAST", "CONVERT",
    "PARTITION", "OVER",
    "ROW_NUMBER", "RANK", "DENSE_RANK", "NTILE", "PERCENT_RANK",
    "LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE",
    "SUM", "COUNT", "AVG", "MIN", "MAX",
    "COALESCE", "NULLIF", "ISNULL",
    "DATEADD", "DATEDIFF", "GETDATE", "GETUTCDATE",
    "YEAR", "MONTH", "DAY",
    "WITHIN", "GROUP",
    "STRING_AGG", "STUFF", "FOR", "XML", "PATH", "JSON",
    "IF", "BEGIN", "END", "RETURN", "DECLARE", "EXEC", "EXECUTE",
    "ASC", "DESC",
    "INNER", "CROSS", "APPLY",
    "EXCEPT", "PIVOT", "UNPIVOT",
    "ROLLUP", "CUBE",
    "FETCH", "NEXT", "ROWS", "ONLY",
    "WINDOW",
    "FILTER",
    "VARCHAR", "NVARCHAR", "INT", "BIGINT", "SMALLINT", "TINYINT",
    "DECIMAL", "NUMERIC", "FLOAT", "REAL",
    "DATE", "DATETIME", "DATETIME2", "TIME", "TIMESTAMP",
    "BIT", "CHAR", "NCHAR", "TEXT", "NTEXT",
    "UNIQUEIDENTIFIER", "VARBINARY", "BINARY",
    "TRUE", "FALSE",
];

pub fn is_keyword(s: &str) -> bool {
    let upper = s.to_uppercase();
    KEYWORDS.contains(&upper.as_str())
}

pub fn tokenize(input: &str) -> Vec<Token> {
    let chars: Vec<char> = input.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        // Line comment
        if c == '-' && i + 1 < chars.len() && chars[i + 1] == '-' {
            let mut comment = String::from("--");
            i += 2;
            while i < chars.len() && chars[i] != '\n' {
                comment.push(chars[i]);
                i += 1;
            }
            tokens.push(Token::LineComment(comment));
            continue;
        }

        // Newline
        if c == '\n' {
            tokens.push(Token::Newline);
            i += 1;
            continue;
        }

        // Whitespace (not newline)
        if c.is_whitespace() {
            tokens.push(Token::Whitespace);
            while i < chars.len() && chars[i].is_whitespace() && chars[i] != '\n' {
                i += 1;
            }
            continue;
        }

        // String literal
        if c == '\'' {
            let mut s = String::from("'");
            i += 1;
            while i < chars.len() {
                if chars[i] == '\'' {
                    s.push('\'');
                    i += 1;
                    // Handle escaped quote ''
                    if i < chars.len() && chars[i] == '\'' {
                        s.push('\'');
                        i += 1;
                    } else {
                        break;
                    }
                } else {
                    s.push(chars[i]);
                    i += 1;
                }
            }
            tokens.push(Token::StringLit(s));
            continue;
        }

        // Quoted identifier [...]
        if c == '[' {
            let mut s = String::from("[");
            i += 1;
            while i < chars.len() && chars[i] != ']' {
                s.push(chars[i]);
                i += 1;
            }
            if i < chars.len() {
                s.push(']');
                i += 1;
            }
            tokens.push(Token::Ident(s));
            continue;
        }

        // Quoted identifier "..."
        if c == '"' {
            let mut s = String::from("\"");
            i += 1;
            while i < chars.len() && chars[i] != '"' {
                s.push(chars[i]);
                i += 1;
            }
            if i < chars.len() {
                s.push('"');
                i += 1;
            }
            tokens.push(Token::Ident(s));
            continue;
        }

        // Number
        if c.is_ascii_digit() || (c == '.' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit()) {
            let mut num = String::new();
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                num.push(chars[i]);
                i += 1;
            }
            tokens.push(Token::Number(num));
            continue;
        }

        // Identifier or keyword
        if c.is_alphabetic() || c == '_' || c == '#' || c == '@' {
            let mut word = String::new();
            while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_' || chars[i] == '#' || chars[i] == '@') {
                word.push(chars[i]);
                i += 1;
            }
            if is_keyword(&word) {
                tokens.push(Token::Keyword(word.to_uppercase()));
            } else {
                tokens.push(Token::Ident(word));
            }
            continue;
        }

        // Multi-char operators
        if c == '<' || c == '>' || c == '!' {
            if i + 1 < chars.len() && (chars[i + 1] == '=' || chars[i + 1] == '>') {
                let mut op = String::new();
                op.push(c);
                op.push(chars[i + 1]);
                tokens.push(Token::Operator(op));
                i += 2;
                continue;
            }
        }

        // Single char tokens
        match c {
            ',' => { tokens.push(Token::Comma); i += 1; }
            '.' => { tokens.push(Token::Dot); i += 1; }
            '(' => { tokens.push(Token::LParen); i += 1; }
            ')' => { tokens.push(Token::RParen); i += 1; }
            ';' => { tokens.push(Token::Semicolon); i += 1; }
            '+' | '-' | '*' | '/' | '%' | '=' | '<' | '>' | '!' => {
                tokens.push(Token::Operator(c.to_string()));
                i += 1;
            }
            _ => { i += 1; } // skip unknown
        }
    }

    tokens
}
