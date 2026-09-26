/**
 * Utility to map JSON Pointer paths (RFC 6901) to line and column locations in raw JSON strings.
 * Used for in-editor Monaco error markers and click-to-jump diagnostics.
 */

export interface SourceLocation {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

function encodePointerSegment(seg: string): string {
  return seg.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Builds a lookup map of JSON Pointer -> SourceLocation from a JSON string in a single pass.
 */
export function buildJsonPathMap(text: string): Map<string, SourceLocation> {
  const pathMap = new Map<string, SourceLocation>();
  let pos = 0;
  let line = 1;
  let col = 1;

  function advance() {
    if (pos < text.length) {
      const ch = text[pos];
      pos++;
      if (ch === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
    }
  }

  function skipWhitespace() {
    while (pos < text.length) {
      const ch = text[pos];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        advance();
      } else {
        break;
      }
    }
  }

  function parseString(): { value: string; loc: SourceLocation } | null {
    if (pos >= text.length || text[pos] !== '"') return null;
    const startLine = line;
    const startCol = col;
    advance(); // skip opening quote
    let val = '';

    while (pos < text.length) {
      const ch = text[pos];
      if (ch === '"') {
        advance(); // skip closing quote
        return {
          value: val,
          loc: {
            startLineNumber: startLine,
            startColumn: startCol,
            endLineNumber: line,
            endColumn: col,
          },
        };
      }
      if (ch === '\\') {
        advance();
        if (pos >= text.length) break;
        const esc = text[pos];
        advance();
        if (esc === '"') val += '"';
        else if (esc === '\\') val += '\\';
        else if (esc === '/') val += '/';
        else if (esc === 'b') val += '\b';
        else if (esc === 'f') val += '\f';
        else if (esc === 'n') val += '\n';
        else if (esc === 'r') val += '\r';
        else if (esc === 't') val += '\t';
        else if (esc === 'u') {
          for (let i = 0; i < 4 && pos < text.length; i++) advance();
          val += '?';
        } else {
          val += esc;
        }
      } else {
        val += ch;
        advance();
      }
    }

    return {
      value: val,
      loc: {
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: line,
        endColumn: col,
      },
    };
  }

  function parsePrimitive(): SourceLocation {
    const startLine = line;
    const startCol = col;
    while (pos < text.length) {
      const ch = text[pos];
      if (
        ch === ',' ||
        ch === '}' ||
        ch === ']' ||
        ch === ' ' ||
        ch === '\t' ||
        ch === '\r' ||
        ch === '\n'
      ) {
        break;
      }
      advance();
    }
    return {
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: line,
      endColumn: col,
    };
  }

  function parseObject(currentPath: string[]) {
    const objStartLine = line;
    const objStartCol = col;
    advance(); // skip '{'

    const currentPathStr = '/' + currentPath.map(encodePointerSegment).join('/');
    if (!pathMap.has(currentPathStr)) {
      pathMap.set(currentPathStr, {
        startLineNumber: objStartLine,
        startColumn: objStartCol,
        endLineNumber: objStartLine,
        endColumn: objStartCol + 1,
      });
    }

    while (pos < text.length) {
      skipWhitespace();
      if (pos >= text.length) break;
      if (text[pos] === '}') {
        advance();
        break;
      }
      if (text[pos] === ',') {
        advance();
        continue;
      }
      if (text[pos] === '"') {
        const keyInfo = parseString();
        if (!keyInfo) break;
        skipWhitespace();
        if (pos < text.length && text[pos] === ':') {
          advance();
        }
        skipWhitespace();
        const propPath = [...currentPath, keyInfo.value];
        const propPathStr = '/' + propPath.map(encodePointerSegment).join('/');

        // Store key location for this property
        pathMap.set(propPathStr, keyInfo.loc);

        // Parse property value
        parseValue(propPath);
      } else {
        advance();
      }
    }
  }

  function parseArray(currentPath: string[]) {
    const arrStartLine = line;
    const arrStartCol = col;
    advance(); // skip '['

    const currentPathStr = '/' + currentPath.map(encodePointerSegment).join('/');
    if (!pathMap.has(currentPathStr)) {
      pathMap.set(currentPathStr, {
        startLineNumber: arrStartLine,
        startColumn: arrStartCol,
        endLineNumber: arrStartLine,
        endColumn: arrStartCol + 1,
      });
    }

    let index = 0;
    while (pos < text.length) {
      skipWhitespace();
      if (pos >= text.length) break;
      if (text[pos] === ']') {
        advance();
        break;
      }
      if (text[pos] === ',') {
        advance();
        continue;
      }

      const itemPath = [...currentPath, String(index)];
      const itemPathStr = '/' + itemPath.map(encodePointerSegment).join('/');
      const itemStartLine = line;
      const itemStartCol = col;

      parseValue(itemPath);

      if (!pathMap.has(itemPathStr)) {
        pathMap.set(itemPathStr, {
          startLineNumber: itemStartLine,
          startColumn: itemStartCol,
          endLineNumber: line,
          endColumn: col,
        });
      }
      index++;
    }
  }

  function parseValue(currentPath: string[]) {
    skipWhitespace();
    if (pos >= text.length) return;
    const ch = text[pos];
    if (ch === '{') {
      parseObject(currentPath);
    } else if (ch === '[') {
      parseArray(currentPath);
    } else if (ch === '"') {
      const str = parseString();
      if (str && currentPath.length > 0) {
        const pathStr = '/' + currentPath.map(encodePointerSegment).join('/');
        if (!pathMap.has(pathStr)) {
          pathMap.set(pathStr, str.loc);
        }
      }
    } else {
      const primLoc = parsePrimitive();
      if (currentPath.length > 0) {
        const pathStr = '/' + currentPath.map(encodePointerSegment).join('/');
        if (!pathMap.has(pathStr)) {
          pathMap.set(pathStr, primLoc);
        }
      }
    }
  }

  skipWhitespace();
  if (pos < text.length) {
    parseValue([]);
  }

  // Ensure root '/' is always present
  if (!pathMap.has('/')) {
    pathMap.set('/', {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 2,
    });
  }

  return pathMap;
}

/**
 * Resolves a JSON Pointer to the closest matching SourceLocation.
 */
export function locateError(
  pathMap: Map<string, SourceLocation>,
  instancePath: string,
  missingProperty?: string
): SourceLocation {
  const normPath = instancePath && instancePath !== '' ? instancePath : '/';

  // 1. Direct match on instancePath
  if (pathMap.has(normPath)) {
    return pathMap.get(normPath)!;
  }

  // 2. If it's a missingProperty error, try parent / missingProperty
  if (missingProperty) {
    const encodedProp = encodePointerSegment(missingProperty);
    const candidate = normPath === '/' ? `/${encodedProp}` : `${normPath}/${encodedProp}`;
    if (pathMap.has(candidate)) {
      return pathMap.get(candidate)!;
    }
  }

  // 3. Walk up the path hierarchy to find the nearest parent
  let current = normPath;
  while (current.length > 1) {
    const lastSlash = current.lastIndexOf('/');
    if (lastSlash < 0) break;
    current = lastSlash === 0 ? '/' : current.slice(0, lastSlash);
    if (pathMap.has(current)) {
      return pathMap.get(current)!;
    }
  }

  // 4. Default fallback to root
  return (
    pathMap.get('/') || {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 2,
    }
  );
}
