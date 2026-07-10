pub fn yaml_to_json(yaml: &str) -> crate::Result<String> {
    let value: serde_yaml::Value = serde_yaml::from_str(yaml)?;
    Ok(serde_json::to_string_pretty(&value)?)
}

pub fn json_to_yaml(json: &str) -> crate::Result<String> {
    let value: serde_json::Value = serde_json::from_str(json)?;
    serde_yaml::to_string(&value).map_err(Into::into)
}

pub fn jmespath_query(json: &str, query: &str) -> crate::Result<String> {
    let expr = jmespath::compile(query).map_err(|e| crate::CoreError::Message(e.to_string()))?;
    let data = jmespath::Variable::from_json(json)
        .map_err(|e| crate::CoreError::Message(e.to_string()))?;
    let result = expr
        .search(data)
        .map_err(|e| crate::CoreError::Message(e.to_string()))?;
    serde_json::to_string_pretty(&result).map_err(Into::into)
}
