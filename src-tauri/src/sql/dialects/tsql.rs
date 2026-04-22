use crate::sql::traits::{Lexer, Token, SqlProcessor, DialectConfig, SqlDialect};
use crate::lexer; // We can still leverage some logic or migrate it fully
use crate::formatter;

pub struct TSqlLexer;

impl Lexer for TSqlLexer {
    fn tokenize(&self, input: &str) -> Vec<Token> {
        let old_tokens = lexer::tokenize(input);
        old_tokens.into_iter().map(|t| match t {
            lexer::Token::Keyword(s) => Token::Keyword(s),
            lexer::Token::Ident(s) => Token::Identifier(s),
            lexer::Token::Number(s) => Token::Literal(s),
            lexer::Token::StringLit(s) => Token::Literal(s),
            lexer::Token::Operator(s) => Token::Operator(s),
            lexer::Token::Comma => Token::Punctuation(','),
            lexer::Token::Dot => Token::Punctuation('.'),
            lexer::Token::LParen => Token::Punctuation('('),
            lexer::Token::RParen => Token::Punctuation(')'),
            lexer::Token::Semicolon => Token::Punctuation(';'),
            lexer::Token::LineComment(s) => Token::Comment(s),
            lexer::Token::Newline => Token::Whitespace("\n".to_string()),
            lexer::Token::Whitespace => Token::Whitespace(" ".to_string()),
        }).collect()
    }
}

pub struct TSqlFormatter;

impl SqlProcessor for TSqlFormatter {
    fn process(&self, tokens: &[Token], _config: &DialectConfig) -> String {
        let old_tokens: Vec<lexer::Token> = tokens.iter().map(|t| match t {
            Token::Keyword(s) => lexer::Token::Keyword(s.clone()),
            Token::Identifier(s) => lexer::Token::Ident(s.clone()),
            Token::Literal(s) => {
                if s.starts_with('\'') {
                    lexer::Token::StringLit(s.clone())
                } else {
                    lexer::Token::Number(s.clone())
                }
            },
            Token::Operator(s) => lexer::Token::Operator(s.clone()),
            Token::Punctuation(c) => match c {
                ',' => lexer::Token::Comma,
                '.' => lexer::Token::Dot,
                '(' => lexer::Token::LParen,
                ')' => lexer::Token::RParen,
                ';' => lexer::Token::Semicolon,
                _ => lexer::Token::Operator(c.to_string()),
            },
            Token::Whitespace(s) => {
                if s.contains('\n') {
                    lexer::Token::Newline
                } else {
                    lexer::Token::Whitespace
                }
            },
            Token::Comment(s) => lexer::Token::LineComment(s.clone()),
        }).collect();

        formatter::format(old_tokens)
    }
}

pub struct TSqlDialect;

impl SqlDialect for TSqlDialect {
    fn get_config(&self) -> DialectConfig {
        DialectConfig {
            name: "TSQL".to_string(),
            quote_style: '[',
            indent_size: 1, // Tab
            uppercase_keywords: true,
        }
    }

    fn get_lexer(&self) -> Box<dyn Lexer> {
        Box::new(TSqlLexer)
    }

    fn get_formatter(&self) -> Box<dyn SqlProcessor> {
        Box::new(TSqlFormatter)
    }
}
