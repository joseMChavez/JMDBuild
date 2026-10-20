import { useEffect, useId, useRef } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'

const COMMANDS = [
  [
    { command: 'bold', label: 'bold', content: <b>B</b> },
    { command: 'italic', label: 'italic', content: <i>I</i> },
    { command: 'underline', label: 'underline', content: <u>U</u> },
  ],
  [
    { command: 'insertUnorderedList', label: 'bulletList', content: '•' },
    { command: 'insertOrderedList', label: 'numberList', content: '1.' },
  ],
]
const FONT_SIZES = [12, 14, 16, 18, 24, 32]

export default function RichTextEditor({ busy, onConvert }) {
  const { t } = useI18n()
  const editor = useRef(null)
  const savedRange = useRef(null)
  const labelId = useId()
  const editorId = useId()

  // Toolbar clicks move focus away from the editor; remember the selection so commands apply to it.
  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection()
      if (selection?.rangeCount && editor.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange()
    }
    document.addEventListener('selectionchange', remember)
    return () => document.removeEventListener('selectionchange', remember)
  }, [])

  function restoreSelection() {
    editor.current.focus()
    const selection = window.getSelection()
    if (savedRange.current && selection) {
      selection.removeAllRanges()
      selection.addRange(savedRange.current)
    }
  }

  function runCommand(command) {
    restoreSelection()
    document.execCommand(command, false, null)
  }

  function applyFontSize(size) {
    restoreSelection()
    const selection = window.getSelection()
    if (!selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    const span = document.createElement('span')
    span.style.fontSize = `${size}px`
    if (range.collapsed) {
      // A zero-width marker gives the caret a place inside the new span; the converter strips it.
      const marker = document.createTextNode('​')
      span.append(marker)
      range.insertNode(span)
      range.setStart(marker, 1)
      range.collapse(true)
    } else {
      span.append(range.extractContents())
      range.insertNode(span)
      range.selectNodeContents(span)
      range.collapse(false)
    }
    selection.removeAllRanges()
    selection.addRange(range)
  }

  async function convert() {
    if (!(await onConvert(editor.current.innerHTML))) editor.current.focus()
  }

  return (
    <div className="text-panel">
      <div id={labelId} className="field-label" onClick={() => editor.current.focus()}>
        {t('textLabel')}
      </div>
      <div className="editor-toolbar" role="toolbar" aria-label={t('listLabel')} aria-controls={editorId}>
        {COMMANDS.map((group, i) => (
          <div key={i} className="toolbar-group">
            {group.map(({ command, label, content }) => (
              <button
                key={command}
                type="button"
                aria-label={t(label)}
                title={t(label)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runCommand(command)}
              >
                {content}
              </button>
            ))}
            <span className="divider" aria-hidden="true" />
          </div>
        ))}
        <select aria-label={t('fontSize')} value="" onChange={(e) => e.target.value && applyFontSize(e.target.value)}>
          <option value="">{t('fontSize')}</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} px
            </option>
          ))}
        </select>
      </div>
      <div
        ref={editor}
        id={editorId}
        className="rich-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelId}
        data-placeholder={t('textPlaceholder')}
        onInput={(e) => {
          // Browsers leave a lone <br> after everything is deleted, which hides the placeholder.
          if (e.currentTarget.innerHTML === '<br>') e.currentTarget.innerHTML = ''
        }}
      />
      <button className="button" type="button" disabled={busy} onClick={convert}>
        {t('convertText')}
      </button>
    </div>
  )
}
