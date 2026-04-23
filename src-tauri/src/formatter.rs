use crate::lexer::Token;

// ══════════════════════════════════════════════════════════
// STREAM
// ══════════════════════════════════════════════════════════
struct S {
    t: Vec<Token>,
    p: usize,
}

macro_rules! is_ws {
    ($t:expr) => { matches!($t, Token::Whitespace | Token::Newline) }
}

impl S {
    fn new(t: Vec<Token>) -> Self { S { t, p: 0 } }
    fn peek(&self) -> Option<&Token> { self.t.get(self.p) }
    fn peek_sig(&self) -> Option<&Token> {
        let mut i = self.p;
        while i < self.t.len() && is_ws!(&self.t[i]) { i += 1; }
        self.t.get(i)
    }
    fn adv(&mut self) -> Option<Token> {
        if self.p < self.t.len() { let r = self.t[self.p].clone(); self.p += 1; Some(r) } else { None }
    }
    fn skip(&mut self) {
        while self.peek().map(|x| is_ws!(x)).unwrap_or(false) { self.adv(); }
    }
    fn eat(&mut self, kw: &str) -> bool {
        let mut i = self.p;
        while i < self.t.len() && is_ws!(&self.t[i]) { i += 1; }
        if matches!(self.t.get(i), Some(Token::Keyword(k)) if k.eq_ignore_ascii_case(kw)) {
            self.p = i + 1; true
        } else { false }
    }
    fn is(&self, kw: &str) -> bool {
        matches!(self.peek_sig(), Some(Token::Keyword(k)) if k.eq_ignore_ascii_case(kw))
    }
    fn is_any(&self, kws: &[&str]) -> bool {
        matches!(self.peek_sig(), Some(Token::Keyword(k)) if kws.iter().any(|s| k.eq_ignore_ascii_case(s)))
    }
    fn take_kw(&mut self) -> String {
        self.skip();
        match self.adv() { Some(Token::Keyword(k)) => k, _ => String::new() }
    }
    // find close ) index; self.p is just after (
    fn close(&self) -> usize {
        let mut d = 1usize; let mut i = self.p;
        while i < self.t.len() {
            match &self.t[i] { Token::LParen => d += 1, Token::RParen => { d -= 1; if d == 0 { return i; } } _ => {} }
            i += 1;
        }
        i
    }
    fn has_kw(&self, a: usize, b: usize, kws: &[&str]) -> bool {
        (a..b).any(|i| matches!(&self.t[i], Token::Keyword(k) if kws.iter().any(|s| k.eq_ignore_ascii_case(s))))
    }
    // render tokens[a..b] as compact inline string
    fn inline(&self, a: usize, b: usize) -> String {
        let mut out = String::new();
        let mut i = a;
        while i < b {
            match &self.t[i] {
                x if is_ws!(x) => {
                    if !out.is_empty() && !out.ends_with(' ') && !out.ends_with('.') { out.push(' '); }
                }
                Token::Dot => { while out.ends_with(' ') { out.pop(); } out.push('.'); }
                Token::Comma => { while out.ends_with(' ') { out.pop(); } out.push(','); out.push(' '); }
                t => {
                    let s = ts(t);
                    out.push_str(&s);
                }
            }
            i += 1;
        }
        out.trim_end().to_string()
    }
}

fn ts(t: &Token) -> String {
    match t {
        Token::Keyword(s)|Token::Ident(s)|Token::Number(s)|Token::StringLit(s)|Token::Operator(s)|Token::LineComment(s) => s.clone(),
        Token::Comma => ",".into(), Token::Dot => ".".into(),
        Token::LParen => "(".into(), Token::RParen => ")".into(), Token::Semicolon => ";".into(),
        _ => " ".into(),
    }
}

// ══════════════════════════════════════════════════════════
// OUTPUT
// ══════════════════════════════════════════════════════════
struct W(String);
impl W {
    fn new() -> Self { W(String::new()) }
    fn p(&mut self, s: &str)   { self.0.push_str(s); }
    fn nl(&mut self)            { self.0.push('\n'); }
    fn t(&mut self, n: usize)  { for _ in 0..n { self.0.push('\t'); } }
    fn nlt(&mut self, n: usize){ self.nl(); self.t(n); }
    // ensure we have a newline at end (avoid double)
    fn ensure_nl(&mut self) {
        while self.0.ends_with(' ') || self.0.ends_with('\t') { self.0.pop(); }
        if !self.0.ends_with('\n') && !self.0.is_empty() { self.nl(); }
    }
}

// ══════════════════════════════════════════════════════════
// ENTRY
// ══════════════════════════════════════════════════════════
pub fn format(tokens: Vec<Token>) -> String {
    let mut s = S::new(tokens);
    let mut w = W::new();
    do_query(&mut s, &mut w, 0);
    w.0
}

/// Convenience function to format a SQL string
pub fn format_string(sql: &str) -> String {
    let tokens = crate::lexer::tokenize(sql);
    format(tokens)
}

fn do_query(s: &mut S, w: &mut W, ind: usize) {
    s.skip();
    if s.is("WITH") { s.adv(); w.p("WITH \n"); s.skip(); do_cte_list(s, w, ind); }
    s.skip();
    while let Some(Token::LineComment(c)) = s.peek().cloned() {
        s.adv(); w.p(&c); w.nl(); s.skip();
    }
    if s.is("SELECT") { do_select(s, w, ind); }
    else if s.is("INSERT") { do_insert(s, w, ind); }
    else if s.is("UPDATE") { do_update(s, w, ind); }
    else if s.is("DELETE") { do_delete(s, w, ind); }
    else if s.is("MERGE") { do_merge(s, w, ind); }
    
    s.skip();
    if matches!(s.peek_sig(), Some(Token::Semicolon)) { s.skip(); s.adv(); w.p(";"); }
}

// ══════════════════════════════════════════════════════════
// CTE LIST
// ══════════════════════════════════════════════════════════
fn do_cte_list(s: &mut S, w: &mut W, ind: usize) {
    loop {
        s.skip();
        if let Some(Token::LineComment(c)) = s.peek().cloned() {
            s.adv(); w.nl(); w.p(&c); w.nl(); s.skip();
        }
        let name = match s.peek_sig().cloned() {
            Some(Token::Ident(n)) => { s.skip(); s.adv(); n }
            _ => break,
        };
        w.p(&name);
        if !s.eat("AS") { break; }
        w.p(" AS\n"); w.t(ind); w.p("(\n");
        s.skip(); if matches!(s.peek(), Some(Token::LParen)) { s.adv(); }
        w.t(ind + 1); do_select(s, w, ind + 1);
        s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
        w.nl(); w.t(ind); w.p(")");
        s.skip();
        if matches!(s.peek(), Some(Token::Comma)) {
            s.adv(); w.p(","); w.nl(); s.skip();
            if let Some(Token::LineComment(c)) = s.peek().cloned() {
                s.adv(); w.p(&c); w.nl(); s.skip();
            }
        } else { w.nl(); break; }
    }
}

// ══════════════════════════════════════════════════════════
// SELECT  (ind = indent level of the SELECT keyword itself)
// ══════════════════════════════════════════════════════════
fn do_select(s: &mut S, w: &mut W, ind: usize) {
    s.skip();
    while matches!(s.peek(), Some(Token::LineComment(_))) {
        if let Some(Token::LineComment(c)) = s.adv() {
            w.t(ind); w.p(&c); w.nl(); s.skip();
        }
    }
    if s.is("VALUES") {
        do_values(s, w, ind);
        return;
    }
    if s.is("SELECT") { s.adv(); }
    w.p("SELECT ");
    s.skip();
    if s.eat("DISTINCT") { w.p("DISTINCT "); s.skip(); }
    if s.is("TOP") {
        s.adv(); w.p("\n"); w.t(ind + 1); w.p("TOP ");
        s.skip();
        if matches!(s.peek(), Some(Token::LParen)) {
            s.adv(); let cl = s.close();
            let r = s.inline(s.p, cl); w.p("("); w.p(&r);
            s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
            w.p(") ");
        } else if let Some(Token::Number(n)) = s.peek_sig().cloned() {
            s.skip(); s.adv(); w.p(&n); w.p(" ");
        }
        s.skip(); if s.eat("PERCENT") { w.p("PERCENT "); }
    }
    w.nl();
    do_col_list(s, w, ind + 1);

    loop {
        s.skip();
        if let Some(Token::LineComment(c)) = s.peek().cloned() {
            s.adv(); w.ensure_nl(); w.t(ind); w.p(&c); w.nl(); continue;
        }
        if      s.is("FROM")                               { do_from(s, w, ind); }
        else if s.is("WHERE")                              { do_where(s, w, ind, "WHERE"); }
        else if s.is("HAVING")                             { do_where(s, w, ind, "HAVING"); }
        else if s.is("GROUP")                              { do_group_by(s, w, ind); }
        else if s.is("ORDER")                              { do_order_by(s, w, ind); }
        else if s.is_any(&["UNION","INTERSECT","EXCEPT"])  { do_set_op(s, w, ind); }
        else { break; }
    }
}

fn do_insert(s: &mut S, w: &mut W, ind: usize) {
    s.adv(); // INSERT
    w.p("INSERT ");
    if s.eat("INTO") { w.p("INTO\n"); } else { w.nl(); }
    w.t(ind + 1);
    w.p(&do_dotted(s));
    s.skip();
    if matches!(s.peek(), Some(Token::LParen)) {
        s.adv(); w.nl(); w.t(ind + 1); w.p("(\n");
        do_col_list(s, w, ind + 3);
        s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
        w.t(ind + 1); w.p(")\n");
    } else {
        w.nl();
    }
    s.skip();
    if s.is("SELECT") { do_select(s, w, ind); }
    else if s.is("VALUES") { do_values(s, w, ind); }
}

fn do_update(s: &mut S, w: &mut W, ind: usize) {
    s.adv(); w.p("UPDATE ");
    w.p(&do_dotted(s)); w.nl();
    s.skip();
    if s.is("SET") {
        s.adv(); w.t(ind); w.p("SET\n");
        do_col_list(s, w, ind + 1);
    }
    loop {
        s.skip();
        if s.is("FROM") { do_from(s, w, ind); }
        else if s.is("WHERE") { do_where(s, w, ind, "WHERE"); }
        else { break; }
    }
}

fn do_delete(s: &mut S, w: &mut W, ind: usize) {
    s.adv(); w.p("DELETE ");
    if s.eat("FROM") { w.p("FROM "); }
    w.p(&do_dotted(s)); w.nl();
    s.skip();
    if s.is("WHERE") { do_where(s, w, ind, "WHERE"); }
}

fn do_merge(s: &mut S, w: &mut W, ind: usize) {
    s.adv(); w.p("MERGE ");
    if s.eat("INTO") { w.p("INTO "); }
    w.p(&do_dotted(s));
    s.skip();
    if s.eat("USING") {
        w.nl(); w.t(ind); w.p("USING ");
        do_table_ref(s, w, ind + 1);
    }
    s.skip();
    if s.eat("ON") {
        w.nl(); w.t(ind); w.p("ON ");
        do_expr(s, w, ind + 1, Sp::Sub);
    }
}

fn do_values(s: &mut S, w: &mut W, ind: usize) {
    if s.is("VALUES") { s.adv(); }
    w.p("VALUES \n");
    loop {
        s.skip();
        if clause_kw(s) || matches!(s.peek_sig(), Some(Token::RParen)|None) { break; }
        w.t(ind + 1);
        if matches!(s.peek(), Some(Token::LParen)) {
            s.adv(); let cl = s.close();
            let r = s.inline(s.p, cl);
            w.p("("); w.p(&r); w.p(")");
            s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
        } else {
            do_expr(s, w, ind + 1, Sp::List);
        }
        s.skip();
        if matches!(s.peek(), Some(Token::Comma)) {
            s.adv(); w.p(","); w.nl();
        } else { w.nl(); break; }
    }
}

// ══════════════════════════════════════════════════════════
// SELECT COLUMN LIST
// ══════════════════════════════════════════════════════════
fn do_col_list(s: &mut S, w: &mut W, ind: usize) {
    loop {
        s.skip();
        if let Some(Token::LineComment(c)) = s.peek().cloned() {
            s.adv(); w.t(ind); w.p(&c); w.nl(); continue;
        }
        if clause_kw(s) || matches!(s.peek_sig(), Some(Token::RParen)|Some(Token::Semicolon)|None) { break; }
        w.t(ind);
        do_expr(s, w, ind, Sp::Col);
        // alias
        alias(s, w);
        s.skip();
        if matches!(s.peek(), Some(Token::Comma)) { s.adv(); w.p(","); }
        w.nl();
    }
}

// ══════════════════════════════════════════════════════════
// FROM
// ══════════════════════════════════════════════════════════
fn do_from(s: &mut S, w: &mut W, ind: usize) {
    s.adv(); // FROM
    w.ensure_nl(); w.t(ind); w.p("FROM\n"); w.t(ind + 1);
    do_table_ref(s, w, ind + 1);
    loop {
        s.skip();
        if let Some(Token::LineComment(c)) = s.peek().cloned() {
            s.adv(); w.ensure_nl(); w.t(ind); w.p(&c); w.nl(); continue;
        }
        if s.is_any(&["INNER","LEFT","RIGHT","FULL","OUTER","CROSS","JOIN","APPLY"]) { 
            do_join(s, w, ind); 
        } else { break; }
    }
}

fn do_table_ref(s: &mut S, w: &mut W, ind: usize) {
    s.skip();
    if matches!(s.peek(), Some(Token::LParen)) {
        s.adv(); let cl = s.close();
        if s.has_kw(s.p, cl, &["SELECT", "VALUES"]) {
            w.ensure_nl(); w.t(ind); w.p("(\n");
            w.t(ind + 1); do_select(s, w, ind + 1);
            s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
            w.nl(); w.t(ind); w.p(")");
        } else {
            let r = s.inline(s.p, cl); w.p("("); w.p(&r);
            s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
            w.p(")");
        }
    } else {
        w.p(&do_dotted(s));
    }
    // alias: look ahead to see if next non-ws token is an ident (not clause/join kw)
    alias(s, w);
}

fn alias(s: &mut S, w: &mut W) {
    s.skip();
    let has_as = s.eat("AS");
    match s.peek_sig().cloned() {
        Some(Token::Ident(n)) if !join_or_clause(s) => {
            s.skip(); s.adv();
            if has_as { w.p(" AS "); } else { w.p(" "); }
            w.p(&n);
            s.skip();
            if matches!(s.peek(), Some(Token::LParen)) {
                s.adv(); let cl = s.close();
                let r = s.inline(s.p, cl);
                w.p("("); w.p(&r); w.p(")");
                s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
            }
        }
        _ => {}
    }
}

fn do_join(s: &mut S, w: &mut W, ind: usize) {
    let mut jkw = String::new();
    while s.is_any(&["INNER","LEFT","RIGHT","FULL","OUTER","CROSS","JOIN","APPLY"]) {
        s.skip();
        if let Token::Keyword(k) = s.adv().unwrap() {
            if !jkw.is_empty() { jkw.push(' '); }
            jkw.push_str(&k);
        }
    }
    w.ensure_nl(); w.t(ind); w.p(&jkw); w.nl();

    s.skip();
    if matches!(s.peek(), Some(Token::LParen)) {
        s.adv(); let cl = s.close();
        if s.has_kw(s.p, cl, &["SELECT", "VALUES"]) {
            w.t(ind + 1); w.p("(\n");
            w.t(ind + 2); do_select(s, w, ind + 2);
            s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
            w.nl(); w.t(ind + 1); w.p(")");
        } else {
            let r = s.inline(s.p, cl); w.p("("); w.p(&r);
            s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
            w.p(")");
        }
    } else {
        w.t(ind + 1);
        w.p(&do_dotted(s));
    }

    // alias for join table – goes on new indented line
    s.skip();
    if s.is("AS") { s.adv(); s.skip(); }
    match s.peek_sig().cloned() {
        Some(Token::Ident(n)) if !join_or_clause(s) => {
            s.skip(); s.adv();
            w.p(" "); w.p(&n);
        }
        _ => {}
    }

    // ON
    s.skip();
    if s.is("ON") {
        s.adv();
        w.nl(); w.t(ind + 1); w.p("ON \n"); w.t(ind + 2);
        do_cond_list(s, w, ind + 2);
    }
    // trailing comment
    s.skip();
    if let Some(Token::LineComment(c)) = s.peek().cloned() {
        s.adv(); w.p("          "); w.p(&c);
    }
}

// ══════════════════════════════════════════════════════════
// WHERE / HAVING
// ══════════════════════════════════════════════════════════
fn do_where(s: &mut S, w: &mut W, ind: usize, kw: &str) {
    s.adv();
    w.ensure_nl(); w.t(ind); w.p(kw); w.p(" \n"); w.t(ind + 1);
    do_cond_list(s, w, ind + 1);
}

fn do_cond_list(s: &mut S, w: &mut W, ind: usize) {
    loop {
        s.skip();
        if let Some(Token::LineComment(c)) = s.peek().cloned() {
            s.adv(); w.p(&c); w.nl(); w.t(ind); continue;
        }
        if clause_kw(s) || matches!(s.peek_sig(), Some(Token::RParen)|Some(Token::Semicolon)|None) { break; }
        do_expr(s, w, ind, Sp::Cond);
        s.skip();
        if s.is_any(&["AND","OR"]) {
            let kw = s.take_kw(); w.p(" "); w.p(&kw); w.nl(); w.t(ind);
        } else { break; }
    }
}

// ══════════════════════════════════════════════════════════
// GROUP BY / ORDER BY
// ══════════════════════════════════════════════════════════
fn do_group_by(s: &mut S, w: &mut W, ind: usize) {
    s.adv(); s.eat("BY");
    w.ensure_nl(); w.t(ind); w.p("GROUP BY \n"); w.t(ind + 1);
    loop {
        s.skip();
        if clause_kw(s) || matches!(s.peek_sig(), Some(Token::RParen)|Some(Token::Semicolon)|None) { break; }
        do_expr(s, w, ind + 1, Sp::List);
        s.skip();
        if matches!(s.peek(), Some(Token::Comma)) { s.adv(); w.p(",\n"); w.t(ind + 1); }
        else { w.nl(); break; }
    }
}

fn do_order_by(s: &mut S, w: &mut W, ind: usize) {
    s.adv(); s.eat("BY");
    w.ensure_nl(); w.t(ind); w.p("ORDER BY \n"); w.t(ind + 1);
    loop {
        s.skip();
        if clause_kw(s) || matches!(s.peek_sig(), Some(Token::RParen)|Some(Token::Semicolon)|None) { break; }
        do_expr(s, w, ind + 1, Sp::List);
        s.skip();
        if s.is_any(&["ASC","DESC"]) { let d = s.take_kw(); w.p(" "); w.p(&d); }
        s.skip();
        if matches!(s.peek(), Some(Token::Comma)) { s.adv(); w.p(",\n"); w.t(ind + 1); }
        else { w.nl(); break; }
    }
}

// ══════════════════════════════════════════════════════════
// UNION / INTERSECT / EXCEPT
// ══════════════════════════════════════════════════════════
fn do_set_op(s: &mut S, w: &mut W, ind: usize) {
    let kw = s.take_kw();
    w.nl(); w.t(ind + 1); w.nl();
    w.t(ind); w.p(&kw);
    if s.eat("ALL") { w.p(" ALL"); }
    w.nl(); w.t(ind + 1); w.nl();
    w.t(ind);
    do_select(s, w, ind);
}

// ══════════════════════════════════════════════════════════
// EXPRESSION
// ══════════════════════════════════════════════════════════
#[derive(PartialEq, Clone, Copy)]
enum Sp { Col, Cond, List, Sub }

fn do_expr(s: &mut S, w: &mut W, ind: usize, stop: Sp) {
    let mut first = true;
    loop {
        s.skip();
        let sig = s.peek_sig().cloned();
        if let Some(t) = sig.as_ref() {
            if !first {
                match t {
                    Token::Dot | Token::Comma | Token::RParen | Token::Semicolon => {}
                    Token::StringLit(_) if w.0.ends_with('N') => {}
                    _ => {
                        if !w.0.ends_with(' ') && !w.0.ends_with('\n') && !w.0.ends_with('\t') 
                           && !w.0.ends_with('(') && !w.0.ends_with('.') {
                            w.p(" ");
                        }
                    }
                }
            }
        }
        let sig = sig;
        if !first && stop == Sp::Col {
            if let Some(Token::Ident(_)) = sig {
                if !w.0.ends_with('.') && !join_or_clause(s) { break; }
            }
        }
        match s.peek_sig().cloned() {
            None | Some(Token::Semicolon) => break,
            Some(Token::RParen) => break,
            Some(Token::Comma) if matches!(stop, Sp::Col|Sp::List|Sp::Sub) => break,
            Some(Token::Keyword(k)) => {
                let k = k.clone();
                match k.as_str() {
                    "FROM"|"WHERE"|"HAVING"|"GROUP"|"ORDER"|"UNION"|"INTERSECT"|"EXCEPT"|"LIMIT"|"FETCH"|"WITH"|"INNER"|"LEFT"|"RIGHT"|"FULL"|"OUTER"|"CROSS"|"JOIN"|"APPLY" => break,
                    "AND"|"OR" if matches!(stop, Sp::Cond|Sp::Sub) => break,
                    "THEN"|"ELSE"|"END"|"WHEN" if stop == Sp::Sub => break,
                    "AS"|"ASC"|"DESC" => break,
                    _ => {}
                }
                match k.as_str() {
                    "CASE" => { do_case(s, w, ind); }
                    "EXISTS" => {
                        s.skip(); s.adv(); w.p("EXISTS \n"); w.t(ind + 1);
                        s.skip();
                        if matches!(s.peek(), Some(Token::LParen)) {
                            s.adv(); w.p("(\n"); w.t(ind + 2);
                            do_select(s, w, ind + 2);
                            s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                            w.nl(); w.t(ind + 1); w.p(")");
                        }
                    }
                    "NOT" => { s.skip(); s.adv(); w.p("NOT "); }
                    "IS" => {
                        s.skip(); s.adv();
                        w.p(" IS ");
                        if s.eat("NOT") { w.p("NOT "); }
                        if s.eat("NULL") { w.p("NULL"); }
                    }
                    "IN" => {
                        s.skip(); s.adv(); w.p(" IN ");
                        s.skip();
                        if matches!(s.peek(), Some(Token::LParen)) {
                            s.adv(); let cl = s.close();
                            if s.has_kw(s.p, cl, &["SELECT"]) {
                                w.p("(\n"); w.t(ind + 1);
                                do_select(s, w, ind + 1);
                                s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                                w.nl(); w.t(ind); w.p(")");
                            } else {
                                let r = s.inline(s.p, cl); w.p("("); w.p(&r);
                                s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                                w.p(")");
                            }
                        }
                    }
                    "BETWEEN" => {
                        s.skip(); s.adv(); w.p(" BETWEEN ");
                        do_expr(s, w, ind, Sp::Sub);
                        s.skip();
                        if s.eat("AND") { w.p(" AND "); do_expr(s, w, ind, Sp::Sub); }
                        break;
                    }
                    "LIKE" => { s.skip(); s.adv(); w.p(" LIKE "); do_expr(s, w, ind, Sp::Sub); break; }
                    "OVER" => {
                        s.skip(); s.adv();
                        w.p(" OVER\n"); w.t(ind + 1);
                        s.skip();
                        if matches!(s.peek(), Some(Token::LParen)) {
                            s.adv(); w.p("(\n");
                            do_over(s, w, ind + 2);
                            s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                            w.nl(); w.t(ind + 1); w.p(")");
                        }
                        continue;
                    }
                    "WITHIN" => {
                        s.skip(); s.adv(); s.eat("GROUP");
                        w.p(" \n"); w.t(ind + 1); w.p("WITHIN GROUP \n"); w.t(ind + 2);
                        s.skip();
                        if matches!(s.peek(), Some(Token::LParen)) {
                            s.adv(); w.p("(\n"); w.t(ind + 3);
                            do_over(s, w, ind + 3);
                            s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                            w.nl(); w.t(ind + 2); w.p(")");
                        }
                        break;
                    }
                    "CAST"|"CONVERT" => {
                        s.skip(); s.adv(); w.p(&k);
                        s.skip();
                        if matches!(s.peek(), Some(Token::LParen)) {
                            s.adv(); let cl = s.close();
                            let r = s.inline(s.p, cl); w.p("("); w.p(&r);
                            s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                            w.p(")");
                        }
                    }
                    "SELECT" => { do_select(s, w, ind); break; }
                    "TOP" => {
                        s.skip(); s.adv(); w.p("TOP ");
                        s.skip(); if let Some(Token::Number(n)) = s.peek_sig().cloned() { s.skip(); s.adv(); w.p(&n); w.p(" "); }
                    }
                    _ => {
                        s.skip(); s.adv(); w.p(&k);
                        s.skip();
                        if matches!(s.peek(), Some(Token::LParen)) { do_fn(s, w, ind); }
                    }
                }
            }
            Some(Token::LParen) => {
                s.skip(); s.adv();
                let cl = s.close();
                if s.has_kw(s.p, cl, &["SELECT", "VALUES"]) {
                    w.nl(); w.t(ind + 1); w.p("(\n");
                    w.t(ind + 2); do_select(s, w, ind + 2);
                    s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                    w.nl(); w.t(ind + 1); w.p(")");
                } else {
                    let r = s.inline(s.p, cl); w.p("("); w.p(&r);
                    s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
                    w.p(")");
                }
            }
            Some(Token::Ident(name)) => {
                s.skip(); s.adv();
                w.p(&name);
                s.skip();
                if matches!(s.peek(), Some(Token::LParen)) { do_fn(s, w, ind); }
            }
            Some(Token::Number(n)) => { s.skip(); s.adv(); w.p(&n); }
            Some(Token::StringLit(n)) => { s.skip(); s.adv(); w.p(&n); }
            Some(Token::Operator(op)) => {
                s.skip(); s.adv(); w.p(" "); w.p(&op); w.p(" ");
                s.skip();
                match s.peek_sig() {
                    None | Some(Token::RParen) | Some(Token::Comma) => {}
                    Some(Token::Keyword(k)) => {
                        let k = k.clone();
                        match k.as_str() {
                            "FROM"|"WHERE"|"ORDER"|"GROUP"|"HAVING"|"UNION"
                            |"AND"|"OR"|"THEN"|"ELSE"|"END"|"WHEN" => {}
                            _ => { do_expr(s, w, ind, Sp::Sub); }
                        }
                    }
                    _ => { do_expr(s, w, ind, Sp::Sub); }
                }
                if stop == Sp::Sub { break; }
            }
            Some(Token::LineComment(c)) => { s.skip(); s.adv(); w.p("  "); w.p(&c); break; }
            Some(Token::Dot) => { s.skip(); s.adv(); w.p("."); }
            _ => { s.skip(); s.adv(); }
        }
        first = false;
    }
}

fn do_fn(s: &mut S, w: &mut W, ind: usize) {
    s.skip(); if !matches!(s.peek(), Some(Token::LParen)) { return; }
    s.adv(); let cl = s.close();
    if s.has_kw(s.p, cl, &["SELECT"]) {
        w.p("(\n"); w.t(ind + 1); do_select(s, w, ind + 1);
        s.skip(); if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
        w.nl(); w.t(ind); w.p(")");
    } else {
        let r = s.inline(s.p, cl); w.p("("); w.p(&r);
        s.p = cl; if matches!(s.peek(), Some(Token::RParen)) { s.adv(); }
        w.p(")");
    }
}

fn do_over(s: &mut S, w: &mut W, ind: usize) {
    loop {
        s.skip();
        if matches!(s.peek_sig(), Some(Token::RParen)|None) { break; }
        if s.is("PARTITION") {
            w.ensure_nl(); w.t(ind);
            s.adv(); s.eat("BY");
            w.p("PARTITION BY\n"); w.t(ind);
            loop {
                s.skip();
                if s.is_any(&["ORDER","ROWS","RANGE"]) || matches!(s.peek_sig(), Some(Token::RParen)|None) { break; }
                do_expr(s, w, ind, Sp::List);
                s.skip();
                if matches!(s.peek(), Some(Token::Comma)) { s.adv(); w.p(",\n"); w.t(ind); }
                else { break; }
            }
        } else if s.is("ORDER") {
            w.ensure_nl(); w.t(ind);
            s.adv(); s.eat("BY");
            w.p("ORDER BY\n"); w.t(ind);
            loop {
                s.skip();
                if s.is_any(&["ROWS","RANGE"]) || matches!(s.peek_sig(), Some(Token::RParen)|None) { break; }
                do_expr(s, w, ind, Sp::List);
                s.skip();
                if s.is_any(&["ASC","DESC"]) { let d = s.take_kw(); w.p(" "); w.p(&d); }
                s.skip();
                if matches!(s.peek(), Some(Token::Comma)) { s.adv(); w.p(",\n"); w.t(ind); }
                else { break; }
            }
        } else if s.is_any(&["ROWS","RANGE"]) {
            w.ensure_nl(); w.t(ind);
            let kw = s.take_kw();
            w.p(&kw); w.p(" ");
            do_expr(s, w, ind, Sp::Sub);
        } else {
            let t = s.adv().unwrap();
            w.p(&ts(&t)); w.p(" ");
        }
    }
}

fn do_case(s: &mut S, w: &mut W, ind: usize) {
    s.skip(); s.adv(); // CASE
    s.skip();
    w.p("CASE ");
    let has_val = !s.is("WHEN");
    if has_val { do_expr(s, w, ind, Sp::Sub); w.p(" "); }
    else { w.nl(); }
    loop {
        s.skip(); if !s.is("WHEN") { break; }
        s.adv();
        w.t(ind + 1); w.p("WHEN ");
        do_expr(s, w, ind + 1, Sp::Sub);
        s.skip();
        if s.eat("THEN") {
            w.p(" \n"); w.t(ind + 2); w.p("THEN ");
            do_expr(s, w, ind + 2, Sp::Sub);
            w.nl();
        }
    }
    s.skip(); if s.eat("ELSE") {
        w.t(ind + 1); w.p("ELSE ");
        do_expr(s, w, ind + 1, Sp::Sub);
        w.nl();
    }
    s.skip(); if s.eat("END") { w.t(ind); w.p("END"); }
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
fn clause_kw(s: &S) -> bool {
    s.is_any(&["FROM","WHERE","HAVING","GROUP","ORDER","UNION","INTERSECT","EXCEPT","LIMIT","FETCH","WITH",
               "INNER","LEFT","RIGHT","FULL","OUTER","CROSS","JOIN","APPLY"])
}

fn join_or_clause(s: &S) -> bool {
    s.is_any(&["INNER","LEFT","RIGHT","FULL","OUTER","CROSS","JOIN","APPLY",
               "ON","FROM","WHERE","HAVING","GROUP","ORDER","UNION","INTERSECT","EXCEPT"])
}

fn do_dotted(s: &mut S) -> String {
    let mut parts = Vec::new();
    loop {
        s.skip();
        match s.peek_sig().cloned() {
            Some(Token::Ident(n)) => { s.skip(); s.adv(); parts.push(n); }
            Some(Token::Keyword(k)) => {
                if join_or_clause(s) { break; }
                s.skip(); s.adv(); parts.push(k);
            }
            Some(Token::Operator(op)) if op == "*" => { s.skip(); s.adv(); parts.push("*".to_string()); }
            _ => break,
        }
        s.skip();
        if matches!(s.peek(), Some(Token::Dot)) { s.adv(); } else { break; }
    }
    parts.join(".")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer;

    fn format_sql(sql: &str) -> String {
        let tokens = lexer::tokenize(sql);
        format(tokens)
    }

    #[test]
    fn test_basic_select() {
        let sql = "SELECT a, b FROM table1 t WHERE t.id = 1";
        let formatted = format_sql(sql);
        assert!(formatted.contains("SELECT"));
        assert!(formatted.contains("FROM"));
        assert!(formatted.contains("table1 t"));
        assert!(formatted.contains("WHERE"));
    }

    #[test]
    fn test_cte_formatting() {
        let sql = "WITH cte AS (SELECT * FROM base) SELECT * FROM cte";
        let formatted = format_sql(sql);
        assert!(formatted.contains("WITH"));
        assert!(formatted.contains("cte AS"));
        assert!(formatted.contains("SELECT"));
    }

    #[test]
    fn test_union_all_formatting() {
        let sql = "SELECT * FROM t1 UNION ALL SELECT * FROM t2";
        let formatted = format_sql(sql);
        assert!(formatted.contains("UNION ALL"));
    }

    #[test]
    fn test_alias_spacing() {
        let sql = "SELECT col1 AS c1, col2 c2 FROM table1 t";
        let formatted = format_sql(sql);
        println!("ALIAS OUTPUT:\n'{}'", formatted);
        assert!(formatted.contains("col1 AS c1"));
        assert!(formatted.contains("col2 c2"));
    }

    #[test]
    fn test_complex_join() {
        let sql = "SELECT * FROM Employees e LEFT JOIN Departments d ON e.DeptID = d.ID WHERE e.Salary > 1000";
        let formatted = format_sql(sql);
        assert!(formatted.contains("LEFT JOIN"));
        assert!(formatted.contains("ON"));
        assert!(formatted.contains("Departments d"));
    }
}
