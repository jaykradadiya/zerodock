import { describe, it, expect } from 'vitest';
import { jsonToTypeScript, jsonToGo, jsonToRust, convertJsonToTypes } from '../lib/jsonToTypes';

describe('jsonToTypes', () => {
  it('handles root primitive values without returning empty string', () => {
    expect(jsonToTypeScript('hello')).toBe('export type RootObject = string;');
    expect(jsonToGo('hello')).toBe('type RootObject string');
    expect(jsonToRust('hello')).toBe('pub type RootObject = String;');
  });

  it('handles root primitive arrays without returning empty string', () => {
    expect(jsonToTypeScript([1, 2, 3])).toBe('export type RootObject = number[];');
    expect(jsonToGo([1, 2, 3])).toBe('type RootObject []float64');
    expect(jsonToRust([1, 2, 3])).toBe('pub type RootObject = Vec<f64>;');
  });

  it('quotes TypeScript identifiers with hyphens or spaces', () => {
    const res = jsonToTypeScript({ 'user-id': 123, 'first name': 'Alice' });
    expect(res).toContain('"user-id": number;');
    expect(res).toContain('"first name": string;');
  });

  it('sanitizes Go struct fields to PascalCase without hyphens', () => {
    const res = jsonToGo({ 'user-id': 123, 'first name': 'Alice' });
    expect(res).toContain('\tUserId float64 `json:"user-id"`');
    expect(res).toContain('\tFirstName string `json:"first name"`');
  });

  it('sanitizes Rust struct fields to snake_case and prefixes keywords with r#', () => {
    const res = jsonToRust({ 'user-id': 123, type: 'admin', '2ndItem': true });
    expect(res).toContain('pub user_id: f64,');
    expect(res).toContain('pub r#type: String,');
    expect(res).toContain('pub _2nd_item: bool,');
  });

  it('is immune to prototype pollution in enumeration', () => {
    const obj = Object.create({ polluted: 'yes' });
    obj.ownProp = 'no';
    const res = jsonToTypeScript(obj);
    expect(res).toContain('ownProp: string;');
    expect(res).not.toContain('polluted');
  });

  it('convertJsonToTypes returns clean error on invalid JSON', () => {
    const res = convertJsonToTypes('{ invalid: ', 'typescript');
    expect(res.error).toContain('Invalid JSON');
    expect(res.output).toBe('');
  });
});
