import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, Sun, Moon, Languages, Database, Minimize2, Maximize2 } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'SQL Formatter',
    subtitle: 'Beautify and format SQL queries with proper indentation and keyword uppercasing. No external libs. Client-side only.',
    input: 'SQL Input',
    inputDesc: 'Paste your SQL query here',
    inputPlaceholder: 'SELECT id, name FROM users WHERE active = 1 ORDER BY name',
    output: 'Formatted Output',
    outputDesc: 'Formatted SQL with proper indentation',
    format: 'Format',
    minify: 'Minify',
    copy: 'Copy',
    copied: 'Copied!',
    clear: 'Clear',
    mode: 'Mode',
    builtBy: 'Built by',
    formatted: 'Formatted',
    minified: 'Minified',
  },
  pt: {
    title: 'Formatador SQL',
    subtitle: 'Embeleze e formate queries SQL com identacao correta e palavras-chave em maiusculas. Sem libs externas.',
    input: 'SQL de Entrada',
    inputDesc: 'Cole sua query SQL aqui',
    inputPlaceholder: 'SELECT id, name FROM users WHERE active = 1 ORDER BY name',
    output: 'Saida Formatada',
    outputDesc: 'SQL formatado com identacao correta',
    format: 'Formatar',
    minify: 'Minificar',
    copy: 'Copiar',
    copied: 'Copiado!',
    clear: 'Limpar',
    mode: 'Modo',
    builtBy: 'Criado por',
    formatted: 'Formatado',
    minified: 'Minificado',
  }
} as const
type Lang = keyof typeof translations

// ── SQL Formatter ─────────────────────────────────────────────────────────────
const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN',
  'LIKE', 'IS', 'NULL', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
  'OUTER', 'CROSS', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE',
  'FUNCTION', 'DATABASE', 'SCHEMA', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK',
  'BEGIN', 'TRANSACTION', 'UNION', 'ALL', 'DISTINCT', 'TOP', 'LIMIT', 'OFFSET',
  'ORDER', 'BY', 'GROUP', 'HAVING', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CAST', 'CONVERT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT',
  'NOT', 'NULL', 'AUTO_INCREMENT', 'CONSTRAINT', 'IF', 'ASC', 'DESC', 'WITH',
]

const BREAK_BEFORE = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
  'FULL JOIN', 'CROSS JOIN', 'OUTER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN',
  'ORDER BY', 'GROUP BY', 'HAVING', 'UNION', 'UNION ALL', 'INSERT INTO',
  'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'LIMIT', 'OFFSET', 'ON',
]

function uppercaseKeywords(sql: string): string {
  let result = sql
  for (const kw of KEYWORDS) {
    result = result.replace(new RegExp(`\\b${kw}\\b`, 'gi'), kw)
  }
  return result
}

function formatSql(raw: string): string {
  if (!raw.trim()) return ''

  // Uppercase keywords
  let sql = uppercaseKeywords(raw)

  // Normalize whitespace
  sql = sql.replace(/\s+/g, ' ').trim()

  // Replace compound keywords
  const compounds = [
    'ORDER BY', 'GROUP BY', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN',
    'CROSS JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'UNION ALL', 'INSERT INTO',
    'DELETE FROM', 'NOT IN', 'NOT EXISTS', 'NOT LIKE', 'NOT NULL', 'IS NOT',
  ]
  for (const c of compounds) {
    sql = sql.replace(new RegExp(c.split(' ').join('\\s+'), 'g'), c)
  }

  let result = sql
  let indent = 0

  // Add newlines before major keywords
  for (const kw of BREAK_BEFORE) {
    result = result.replace(new RegExp(`(?<![\\w])${kw.replace(' ', '\\s+')}(?![\\w])`, 'g'), `\n${kw}`)
  }

  // AND / OR on new lines (indented)
  result = result.replace(/\b(AND|OR)\b(?!\s*\()/g, '\n  $1')

  // Split into lines and handle subquery indentation
  const lines = result.split('\n').map(l => l.trim()).filter(Boolean)
  const output: string[] = []

  for (const line of lines) {
    const opens = (line.match(/\(/g) || []).length
    const closes = (line.match(/\)/g) || []).length

    if (closes > opens) indent = Math.max(0, indent - (closes - opens))
    output.push('  '.repeat(indent) + line)
    if (opens > closes) indent += (opens - closes)
  }

  return output.join('\n')
}

function minifySql(raw: string): string {
  return uppercaseKeywords(raw).replace(/\s+/g, ' ').trim()
}

const DEFAULT_SQL = `select u.id, u.name, u.email, count(o.id) as order_count, sum(o.total) as total_spent
from users u
left join orders o on u.id = o.user_id
where u.active = 1 and u.created_at >= '2024-01-01'
and u.email not like '%@test.com'
group by u.id, u.name, u.email
having count(o.id) > 0
order by total_spent desc
limit 100 offset 0`

export default function SqlFormatter() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [input, setInput] = useState(DEFAULT_SQL)
  const [mode, setMode] = useState<'format' | 'minify'>('format')
  const [copied, setCopied] = useState(false)

  const t = translations[lang]
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const output = useMemo(() => {
    return mode === 'minify' ? minifySql(input) : formatSql(input)
  }, [input, mode])

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // Syntax highlight
  const highlight = (sql: string) => {
    return sql
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g'), '<span class="text-amber-500 font-semibold">$1</span>')
      .replace(/'[^']*'/g, '<span class="text-green-500">$&</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/--.*/g, '<span class="text-zinc-400 italic">$&</span>')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Database size={18} className="text-white" />
            </div>
            <span className="font-semibold">SQL Formatter</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/sql-formatter" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t.title}</h1>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
            </div>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={() => setMode('format')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'format' ? 'bg-amber-500 text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                <Maximize2 size={12} />{t.formatted}
              </button>
              <button
                onClick={() => setMode('minify')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'minify' ? 'bg-amber-500 text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                <Minimize2 size={12} />{t.minified}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Input */}
            <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <span className="text-xs font-medium text-zinc-500">{t.input}</span>
                <button onClick={() => setInput('')} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">{t.clear}</button>
              </div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="flex-1 resize-none font-mono text-sm p-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none min-h-[400px]"
                spellCheck={false}
              />
            </div>

            {/* Output */}
            <div className="flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <span className="text-xs font-medium text-zinc-500">{t.output}</span>
                <button onClick={copy} className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <div
                className="flex-1 p-4 font-mono text-sm overflow-auto bg-white dark:bg-[#0d0d0f] min-h-[400px] whitespace-pre leading-relaxed"
                dangerouslySetInnerHTML={{ __html: output ? highlight(output) : `<span class="text-zinc-400 italic text-sm">Output will appear here...</span>` }}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
