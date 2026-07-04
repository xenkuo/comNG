declare module 'tabulator-tables' {
  export interface TabulatorInstance {
    redraw(force?: boolean): void
    setTheme(theme: string): void
    getData(): Array<Record<string, any>>
    addRow(data: Record<string, any>, addAtBottom?: boolean | number): void
    clearFilter(): void
    setFilter(field: string, type: string, value: string): void
    getRow(id: string | number): {
      delete(): void
      getData(): Record<string, any>
    } | undefined
  }

  class Tabulator {
    constructor(element: string | HTMLElement, options?: any)
    redraw(force?: boolean): void
    setTheme(theme: string): void
    getData(): Array<Record<string, any>>
    addRow(data: Record<string, any>, addAtBottom?: boolean | number): void
    clearFilter(): void
    setFilter(field: string, type: string, value: string): void
    getRow(id: string | number): {
      delete(): void
      getData(): Record<string, any>
    } | undefined
  }

  export = Tabulator
}
