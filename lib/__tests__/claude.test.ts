/**
 * Claude API 統合のユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LogEvent, AnalysisResponse } from '../../types';

// Raycast API をモック（ファクトリー関数内で定義）
vi.mock('@raycast/api', () => ({
  getPreferenceValues: vi.fn()
}));

import { buildPrompt, parseResponse, fetchAnalysis, validateApiKey } from '../claude';
import { getPreferenceValues } from '@raycast/api';

describe('Claude API Integration', () => {
  describe('buildPrompt', () => {
    it('should build prompt with log events', () => {
      const logs: LogEvent[] = [
        {
          type: 'input',
          ts: Date.now(),
          text: 'search files',
          len: 12
        },
        {
          type: 'launch',
          ts: Date.now() + 1000,
          aliasId: 'search-files',
          target: {
            type: 'builtin',
            command: 'search-files',
            ownerOrAuthorName: 'raycast'
          }
        }
      ];

      const prompt = buildPrompt(logs);

      // プロンプトに生ログが含まれていることを確認
      expect(prompt).toContain('RAW_LOGS');
      expect(prompt).toContain('"type":"input"');
      expect(prompt).toContain('"type":"launch"');
      expect(prompt).toContain('search files');
      expect(prompt).toContain('search-files');

      // ルールが含まれていることを確認
      expect(prompt).toContain('RULES');
      expect(prompt).toContain('frequent launch');
      expect(prompt).toContain('repeated long input');
      expect(prompt).toContain('chain');

      // スキーマが含まれていることを確認
      expect(prompt).toContain('OUTPUT_SCHEMA');
      expect(prompt).toContain('proposals');
      expect(prompt).toContain('extension_hints');
    });

    it('should handle empty logs', () => {
      const prompt = buildPrompt([]);

      expect(prompt).toContain('RAW_LOGS');
      expect(prompt).toContain('RULES');
      expect(prompt).toContain('OUTPUT_SCHEMA');
    });

    it('should format logs as JSONL', () => {
      const logs: LogEvent[] = [
        { type: 'input', ts: 1000, text: 'test1', len: 5 },
        { type: 'input', ts: 2000, text: 'test2', len: 5 }
      ];

      const prompt = buildPrompt(logs);

      // 各ログが1行ずつ（JSONLフォーマット）
      const logsSection = prompt.split('# RULES')[0];
      const lines = logsSection.trim().split('\n').filter(l => l.startsWith('{'));

      expect(lines).toHaveLength(2);
      expect(() => JSON.parse(lines[0])).not.toThrow();
      expect(() => JSON.parse(lines[1])).not.toThrow();
    });
  });

  describe('parseResponse', () => {
    it('should parse valid Claude API response', () => {
      const apiResponse = {
        content: [
          {
            text: JSON.stringify({
              proposals: [
                {
                  type: 'shortcut',
                  title: 'Search Files のショートカット',
                  rationale: '高頻度で使用されています',
                  evidence: {
                    aliases: ['search-files'],
                    count: 15,
                    time_windows: ['09:00-18:00 JST']
                  },
                  payload: {
                    shortcut: {
                      aliasId: 'search-files',
                      suggestedHotkey: 'Alt+Cmd+F'
                    }
                  },
                  confidence: 0.9
                }
              ],
              extension_hints: []
            })
          }
        ]
      };

      const result = parseResponse(apiResponse);

      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].type).toBe('shortcut');
      expect(result.proposals[0].confidence).toBe(0.9);
      expect(result.extension_hints).toEqual([]);
    });

    it('should handle response with extension hints', () => {
      const apiResponse = {
        content: [
          {
            text: JSON.stringify({
              proposals: [],
              extension_hints: [
                {
                  keyword: 'github.com/',
                  frequency: 5,
                  suggested_search: 'github',
                  extension_name: 'GitHub',
                  description: 'GitHub リポジトリの検索と管理'
                }
              ]
            })
          }
        ]
      };

      const result = parseResponse(apiResponse);

      expect(result.proposals).toEqual([]);
      expect(result.extension_hints).toHaveLength(1);
      expect(result.extension_hints[0].extension_name).toBe('GitHub');
    });

    it('should handle empty response', () => {
      const apiResponse = {
        content: [{ text: '' }]
      };

      const result = parseResponse(apiResponse);

      expect(result).toEqual({ proposals: [], extension_hints: [] });
    });

    it('should handle invalid JSON gracefully', () => {
      const apiResponse = {
        content: [{ text: 'invalid json {' }]
      };

      const result = parseResponse(apiResponse);

      // エラーを静かに処理して空の結果を返す
      expect(result).toEqual({ proposals: [], extension_hints: [] });
    });

    it('should handle missing content field', () => {
      const apiResponse = {};

      const result = parseResponse(apiResponse);

      expect(result).toEqual({ proposals: [], extension_hints: [] });
    });

    it('should handle partial response data', () => {
      const apiResponse = {
        content: [
          {
            text: JSON.stringify({
              proposals: [
                {
                  type: 'snippet',
                  title: 'Test',
                  rationale: 'Test'
                  // 他のフィールドが欠けている
                }
              ]
              // extension_hints が欠けている
            })
          }
        ]
      };

      const result = parseResponse(apiResponse);

      expect(result.proposals).toHaveLength(1);
      expect(result.extension_hints).toEqual([]);
    });
  });

  describe('validateApiKey', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return true when API key is set', () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: 'sk-ant-api03-test123'
      });

      const result = validateApiKey();
      expect(result).toBe(true);
    });

    it('should return false when API key is empty', () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: ''
      });

      const result = validateApiKey();
      expect(result).toBe(false);
    });

    it('should return false when API key is undefined', () => {
      vi.mocked(getPreferenceValues).mockReturnValue({});

      const result = validateApiKey();
      expect(result).toBe(false);
    });

    it('should return false when getPreferenceValues throws', () => {
      vi.mocked(getPreferenceValues).mockImplementation(() => {
        throw new Error('Preferences not available');
      });

      const result = validateApiKey();
      expect(result).toBe(false);
    });
  });

  describe('fetchAnalysis', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: ''
      });

      const logs: LogEvent[] = [
        { type: 'input', ts: Date.now(), text: 'test', len: 4 }
      ];

      await expect(fetchAnalysis(logs)).rejects.toThrow('Claude API キーが設定されていません');
    });

    it('should return empty result for empty logs', async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: 'sk-ant-api03-test123'
      });

      const result = await fetchAnalysis([]);

      expect(result).toEqual({ proposals: [], extension_hints: [] });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should limit proposals to 3', async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: 'sk-ant-api03-test123'
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                proposals: [
                  { type: 'shortcut', title: '1', rationale: 'r1', confidence: 0.9 },
                  { type: 'shortcut', title: '2', rationale: 'r2', confidence: 0.8 },
                  { type: 'shortcut', title: '3', rationale: 'r3', confidence: 0.7 },
                  { type: 'shortcut', title: '4', rationale: 'r4', confidence: 0.6 },
                  { type: 'shortcut', title: '5', rationale: 'r5', confidence: 0.5 }
                ],
                extension_hints: []
              })
            }
          ]
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const logs: LogEvent[] = [
        { type: 'input', ts: Date.now(), text: 'test', len: 4 }
      ];

      const result = await fetchAnalysis(logs);

      // 最大3件に制限される
      expect(result.proposals).toHaveLength(3);
      expect(result.proposals[0].title).toBe('1');
      expect(result.proposals[2].title).toBe('3');
    });

    it('should handle 401 error with helpful message', async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: 'sk-ant-api03-invalid'
      });

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const logs: LogEvent[] = [
        { type: 'input', ts: Date.now(), text: 'test', len: 4 }
      ];

      await expect(fetchAnalysis(logs)).rejects.toThrow('APIキーが無効です');
    });

    it('should handle 429 rate limit error', async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: 'sk-ant-api03-test123'
      });

      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: { message: 'Rate limit exceeded' } })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const logs: LogEvent[] = [
        { type: 'input', ts: Date.now(), text: 'test', len: 4 }
      ];

      await expect(fetchAnalysis(logs)).rejects.toThrow('APIレート制限に達しました');
    });

    it('should handle 500 server error', async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: 'sk-ant-api03-test123'
      });

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { message: 'Server error' } })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const logs: LogEvent[] = [
        { type: 'input', ts: Date.now(), text: 'test', len: 4 }
      ];

      await expect(fetchAnalysis(logs)).rejects.toThrow('Claude APIが一時的に利用できません');
    });
  });
});
