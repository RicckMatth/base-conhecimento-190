import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanDocument} from '../lib/documentation.js';
test('documentação remove scripts, eventos e links executáveis',()=>{const s=cleanDocument('<script>alert(1)</script><img src="https://example.org/a.png" onerror="alert(1)"><a href="javascript:alert(1)">X</a><iframe src="https://example.org"></iframe>');assert.ok(!/script|onerror|iframe|javascript/.test(s));assert.ok(s.includes('https://example.org/a.png'));});
test('documentação preserva formatação, tabela e checklist',()=>{const s=cleanDocument('<h2>Guia</h2><p style="text-align:center"><strong>Texto</strong></p><table><tr><td colspan="2">Dado</td></tr></table><ul data-type="taskList"><li data-type="taskItem" data-checked="true">Tarefa</li></ul>');assert.ok(s.includes('<h2>Guia</h2>'));assert.ok(s.includes('colspan="2"'));assert.ok(s.includes('data-checked="true"'));});
