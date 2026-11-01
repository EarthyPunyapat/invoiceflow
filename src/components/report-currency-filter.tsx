/** Plain GET form keeps reporting filters bookmarkable without client JavaScript. */
export function ReportCurrencyFilter({ currency, currencies }: { currency: string; currencies: string[] }) {
  const options = currencies.length ? currencies : ["USD"];
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400" htmlFor="report-currency">
        Currency for totals
        <select id="report-currency" name="currency" defaultValue={currency} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          {options.map(code => <option key={code} value={code}>{code}</option>)}
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">Apply</button>
    </form>
  );
}
