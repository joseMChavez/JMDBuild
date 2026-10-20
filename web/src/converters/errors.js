// An error whose message is an i18n key, so the UI can show it in the current language.
export class ConversionError extends Error {
  constructor(key, args) {
    super(key)
    this.name = 'ConversionError'
    this.key = key
    this.args = args
  }
}
