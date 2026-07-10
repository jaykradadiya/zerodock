use fake::Fake;
use fake::faker::internet::en::SafeEmail;
use fake::faker::name::en::{FirstName, LastName};
use serde_json::{json, Value};

#[derive(Debug, Clone)]
pub struct MockField {
    pub name: String,
    pub field_type: MockFieldType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MockFieldType {
    Name,
    Email,
    Id,
    Number,
    Boolean,
    Date,
    Url,
    Text,
}

pub fn generate_mock_rows(fields: &[MockField], count: usize) -> crate::Result<String> {
    let mut rows = Vec::with_capacity(count);
    for i in 0..count {
        let mut obj = serde_json::Map::new();
        for field in fields {
            obj.insert(field.name.clone(), mock_value(field, i));
        }
        rows.push(Value::Object(obj));
    }
    Ok(serde_json::to_string_pretty(&rows)?)
}

fn mock_value(field: &MockField, index: usize) -> Value {
    match field.field_type {
        MockFieldType::Name => {
            let first: String = FirstName().fake();
            let last: String = LastName().fake();
            json!(format!("{first} {last}"))
        }
        MockFieldType::Email => json!(SafeEmail().fake::<String>()),
        MockFieldType::Id => json!(index + 1),
        MockFieldType::Number => json!(index as i64 + 1),
        MockFieldType::Boolean => json!(index.is_multiple_of(2)),
        MockFieldType::Date => json!(chrono::Utc::now().format("%Y-%m-%d").to_string()),
        MockFieldType::Url => json!(format!("https://example.com/item/{}", index + 1)),
        MockFieldType::Text => json!(format!("Sample text {}", index + 1)),
    }
}

pub fn default_fields() -> Vec<MockField> {
    vec![
        MockField {
            name: "id".into(),
            field_type: MockFieldType::Id,
        },
        MockField {
            name: "name".into(),
            field_type: MockFieldType::Name,
        },
        MockField {
            name: "email".into(),
            field_type: MockFieldType::Email,
        },
    ]
}
