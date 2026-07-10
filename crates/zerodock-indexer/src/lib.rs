use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeType {
    Object,
    Array,
    String,
    Number,
    Boolean,
    Null,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IndexNode {
    pub id: u32,
    pub parent_id: u32,
    pub node_type: NodeType,
    pub key_start: Option<u64>,
    pub key_end: Option<u64>,
    pub value_start: u64,
    pub value_end: u64,
    pub child_count: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct JsonIndex {
    pub nodes: Vec<IndexNode>,
    pub source_len: usize,
}

impl JsonIndex {
    pub fn from_bytes(data: &[u8]) -> anyhow::Result<Self> {
        let nodes = build_index(data)?;
        Ok(Self {
            source_len: data.len(),
            nodes,
        })
    }

    pub fn slice<'a>(&self, data: &'a [u8], node: &IndexNode) -> &'a [u8] {
        let start = node.value_start as usize;
        let end = node.value_end as usize;
        &data[start..end.min(data.len())]
    }

    pub fn children(&self, parent_id: u32) -> Vec<&IndexNode> {
        self.nodes
            .iter()
            .filter(|n| n.parent_id == parent_id)
            .collect()
    }

    pub fn root_children(&self) -> Vec<&IndexNode> {
        self.children(0)
    }
}

pub fn build_index(data: &[u8]) -> anyhow::Result<Vec<IndexNode>> {
    let text = std::str::from_utf8(data).map_err(|e| anyhow::anyhow!("Invalid UTF-8: {e}"))?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }
    let mut nodes = Vec::new();
    let mut next_id = 1u32;
    scan_value(trimmed, 0, trimmed.len(), 0, &mut nodes, &mut next_id)?;
    Ok(nodes)
}

fn scan_value(
    text: &str,
    start: usize,
    end: usize,
    parent_id: u32,
    nodes: &mut Vec<IndexNode>,
    next_id: &mut u32,
) -> anyhow::Result<u32> {
    let slice = &text[start..end];
    let trimmed = slice.trim();
    if trimmed.is_empty() {
        return Ok(parent_id);
    }
    let abs_start = start + slice.find(trimmed).unwrap_or(0);
    let abs_end = abs_start + trimmed.len();
    let id = *next_id;
    *next_id += 1;

    let first = trimmed.chars().next().unwrap();
    let (node_type, child_count) = if first == '{' {
        let children = scan_object_children(text, abs_start, abs_end, id, nodes, next_id)?;
        (NodeType::Object, children)
    } else if first == '[' {
        let children = scan_array_children(text, abs_start, abs_end, id, nodes, next_id)?;
        (NodeType::Array, children)
    } else if first == '"' {
        (NodeType::String, 0)
    } else if trimmed == "true" || trimmed == "false" {
        (NodeType::Boolean, 0)
    } else if trimmed == "null" {
        (NodeType::Null, 0)
    } else {
        (NodeType::Number, 0)
    };

    nodes.push(IndexNode {
        id,
        parent_id,
        node_type,
        key_start: None,
        key_end: None,
        value_start: abs_start as u64,
        value_end: abs_end as u64,
        child_count,
    });
    Ok(id)
}

fn scan_object_children(
    text: &str,
    start: usize,
    end: usize,
    parent_id: u32,
    nodes: &mut Vec<IndexNode>,
    next_id: &mut u32,
) -> anyhow::Result<u32> {
    let inner = &text[start + 1..end - 1];
    let mut count = 0u32;
    for (key_start, key_end, val_start, val_end) in parse_object_entries(inner, start + 1) {
        let key_id = *next_id;
        *next_id += 1;
        nodes.push(IndexNode {
            id: key_id,
            parent_id,
            node_type: NodeType::String,
            key_start: Some(key_start as u64),
            key_end: Some(key_end as u64),
            value_start: key_start as u64,
            value_end: key_end as u64,
            child_count: 0,
        });
        scan_value(text, val_start, val_end, parent_id, nodes, next_id)?;
        count += 1;
    }
    Ok(count)
}

fn scan_array_children(
    text: &str,
    start: usize,
    end: usize,
    parent_id: u32,
    nodes: &mut Vec<IndexNode>,
    next_id: &mut u32,
) -> anyhow::Result<u32> {
    let inner = &text[start + 1..end - 1];
    let mut count = 0u32;
    for (s, e) in parse_array_elements(inner, start + 1) {
        scan_value(text, s, e, parent_id, nodes, next_id)?;
        count += 1;
    }
    Ok(count)
}

fn parse_object_entries(inner: &str, offset: usize) -> Vec<(usize, usize, usize, usize)> {
    let mut entries = Vec::new();
    let bytes = inner.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        while i < bytes.len() && (bytes[i].is_ascii_whitespace() || bytes[i] == b',') {
            i += 1;
        }
        if i >= bytes.len() {
            break;
        }
        if bytes[i] != b'"' {
            break;
        }
        let key_start = offset + i;
        i += 1;
        while i < bytes.len() && bytes[i] != b'"' {
            if bytes[i] == b'\\' {
                i += 2;
            } else {
                i += 1;
            }
        }
        let key_end = offset + i + 1;
        i += 1;
        while i < bytes.len() && bytes[i] != b':' {
            i += 1;
        }
        i += 1;
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        let val_start = offset + i;
        let val_end = offset + find_value_end(inner, i);
        entries.push((key_start, key_end, val_start, val_end));
        i = val_end - offset;
        while i < bytes.len() && bytes[i] != b',' {
            if bytes[i] == b'}' {
                break;
            }
            i += 1;
        }
    }
    entries
}

fn parse_array_elements(inner: &str, offset: usize) -> Vec<(usize, usize)> {
    let mut elements = Vec::new();
    let bytes = inner.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        while i < bytes.len() && (bytes[i].is_ascii_whitespace() || bytes[i] == b',') {
            i += 1;
        }
        if i >= bytes.len() {
            break;
        }
        let start = offset + i;
        let end = offset + find_value_end(inner, i);
        elements.push((start, end));
        i = end - offset;
    }
    elements
}

fn find_value_end(text: &str, start: usize) -> usize {
    let bytes = text.as_bytes();
    let mut i = start;
    if i >= bytes.len() {
        return i;
    }
    match bytes[i] {
        b'"' => {
            i += 1;
            while i < bytes.len() {
                if bytes[i] == b'"' {
                    return i + 1;
                }
                if bytes[i] == b'\\' {
                    i += 2;
                } else {
                    i += 1;
                }
            }
            i
        }
        b'{' | b'[' => {
            let open = bytes[i];
            let close = if open == b'{' { b'}' } else { b']' };
            let mut depth = 0;
            while i < bytes.len() {
                if bytes[i] == open {
                    depth += 1;
                } else if bytes[i] == close {
                    depth -= 1;
                    if depth == 0 {
                        return i + 1;
                    }
                } else if bytes[i] == b'"' {
                    i += 1;
                    while i < bytes.len() && bytes[i] != b'"' {
                        if bytes[i] == b'\\' {
                            i += 2;
                        } else {
                            i += 1;
                        }
                    }
                }
                i += 1;
            }
            i
        }
        _ => {
            while i < bytes.len() && bytes[i] != b',' && bytes[i] != b']' && bytes[i] != b'}' {
                i += 1;
            }
            i
        }
    }
}

#[cfg(feature = "native")]
pub mod mmap {
    use super::*;
    use memmap2::Mmap;
    use std::fs::File;
    use std::path::Path;

    pub struct MmapSource {
        pub mmap: Mmap,
        pub index: JsonIndex,
    }

    impl MmapSource {
        pub fn open(path: &Path) -> anyhow::Result<Self> {
            let file = File::open(path)?;
            let mmap = unsafe { Mmap::map(&file)? };
            let index = JsonIndex::from_bytes(&mmap)?;
            Ok(Self { mmap, index })
        }

        pub fn as_slice(&self) -> &[u8] {
            &self.mmap[..]
        }
    }
}

pub struct IndexProgress {
    pub done: Arc<AtomicBool>,
    pub percent: Arc<std::sync::atomic::AtomicU32>,
}

impl IndexProgress {
    pub fn new() -> Self {
        Self {
            done: Arc::new(AtomicBool::new(false)),
            percent: Arc::new(std::sync::atomic::AtomicU32::new(0)),
        }
    }
}

impl Default for IndexProgress {
    fn default() -> Self {
        Self::new()
    }
}

pub fn build_index_async<F>(data: Vec<u8>, progress: IndexProgress, on_done: F)
where
    F: FnOnce(anyhow::Result<JsonIndex>) + Send + 'static,
{
    #[cfg(not(target_arch = "wasm32"))]
    {
        std::thread::spawn(move || {
            let result = JsonIndex::from_bytes(&data);
            if result.is_ok() {
                progress.percent.store(100, Ordering::Relaxed);
            }
            progress.done.store(true, Ordering::Relaxed);
            on_done(result);
        });
    }

    #[cfg(target_arch = "wasm32")]
    {
        // No threads on wasm32: run inline on the current async executor.
        let result = JsonIndex::from_bytes(&data);
        if result.is_ok() {
            progress.percent.store(100, Ordering::Relaxed);
        }
        progress.done.store(true, Ordering::Relaxed);
        on_done(result);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn indexes_simple_object() {
        let json = r#"{"name":"test","count":42}"#;
        let index = JsonIndex::from_bytes(json.as_bytes()).unwrap();
        assert!(!index.nodes.is_empty());
    }

    #[test]
    fn indexes_object_with_trailing_whitespace() {
        // Regression: trailing whitespace inside an object used to panic
        // because of operator precedence in parse_object_entries.
        let json = b"{\"a\":1 }";
        let index = JsonIndex::from_bytes(json).unwrap();
        assert!(!index.nodes.is_empty());
    }

    #[test]
    fn indexes_object_with_inner_whitespace() {
        let json = b"{  \"a\" : 1  ,  \"b\" : 2  }";
        let index = JsonIndex::from_bytes(json).unwrap();
        let root = index.root_children();
        assert_eq!(root.len(), 1, "one top-level object");
        assert_eq!(root[0].child_count, 2, "object has two entries");
    }
}
