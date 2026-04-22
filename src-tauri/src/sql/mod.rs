pub mod traits;
pub mod dialects;

use traits::SqlDialect;

pub struct SqlEngine {
    dialect: Box<dyn SqlDialect>,
}

impl SqlEngine {
    pub fn new(dialect: Box<dyn SqlDialect>) -> Self {
        Self { dialect }
    }

    pub fn format(&self, input: &str) -> String {
        let config = self.dialect.get_config();
        let lexer = self.dialect.get_lexer();
        let formatter = self.dialect.get_formatter();

        let tokens = lexer.tokenize(input);
        formatter.process(&tokens, &config)
    }
}
