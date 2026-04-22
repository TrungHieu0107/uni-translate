use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Token {
    Keyword(String),
    Identifier(String),
    Literal(String),
    Operator(String),
    Punctuation(char),
    Whitespace(String),
    Comment(String),
}

pub trait Lexer {
    fn tokenize(&self, input: &str) -> Vec<Token>;
}

pub trait SqlProcessor {
    fn process(&self, tokens: &[Token], config: &DialectConfig) -> String;
}

#[derive(Debug, Clone)]
pub struct DialectConfig {
    pub name: String,
    pub quote_style: char,
    pub indent_size: usize,
    pub uppercase_keywords: bool,
}

pub trait SqlDialect {
    fn get_config(&self) -> DialectConfig;
    fn get_lexer(&self) -> Box<dyn Lexer>;
    fn get_formatter(&self) -> Box<dyn SqlProcessor>;
}
