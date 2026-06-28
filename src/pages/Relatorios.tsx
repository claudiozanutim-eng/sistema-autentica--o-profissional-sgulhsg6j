import { useEffect, useState, useMemo } from 'react'
import { getTransactions, type Transaction } from '@/services/transactions'
import { useAppStore } from '@/stores/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTH_NAMES_PT } from '@/lib/finance-utils'

export default function Relatorios() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const { selectedYear } = useAppStore()

  useEffect(() => {
    getTransactions(selectedYear).then(setTransactions).catch(console.error)
  }, [selectedYear])

  const { matrix, groups, monthlyTotals, cumulativeTotals } = useMemo(() => {
    const groupSet = new Set<string>()
    const map: Record<string, Record<number, number>> = {}
    const monthly: number[] = new Array(12).fill(0)

    transactions.forEach((t) => {
      const month = new Date(t.date).getMonth()
      const key = `${t.group || 'Outros'}|${t.category}`
      groupSet.add(t.group || 'Outros')
      if (!map[key]) map[key] = new Array(12).fill(0)
      const val = t.type === 'income' ? t.amount : -t.amount
      map[key][month] += val
      monthly[month] += val
    })

    let cum = 0
    const cumulative = monthly.map((v) => {
      cum += v
      return cum
    })

    const sortedGroups = [...groupSet].sort()
    const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))

    return {
      matrix: entries,
      groups: sortedGroups,
      monthlyTotals: monthly,
      cumulativeTotals: cumulative,
    }
  }, [transactions])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-500 text-sm">Matriz financeira mensal — {selectedYear}</p>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">
            Matriz Mensal por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[200px]">
                    Grupo / Categoria
                  </th>
                  {MONTH_NAMES_PT.map((m) => (
                    <th key={m} className="text-right px-3 py-3 font-medium text-slate-600">
                      {m}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium text-slate-600 bg-slate-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.map(([key, values]) => {
                  const [group, category] = key.split('|')
                  const total = values.reduce((a, b) => a + b, 0)
                  return (
                    <tr key={key} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <span className="text-xs text-slate-400">{group}</span>{' '}
                        <span className="font-medium text-slate-900">{category}</span>
                      </td>
                      {values.map((v, i) => (
                        <td
                          key={i}
                          className={`text-right px-3 py-2 ${v === 0 ? 'text-slate-300' : v > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {v !== 0 &&
                            v.toLocaleString('pt-BR', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                        </td>
                      ))}
                      <td
                        className={`text-right px-4 py-2 font-semibold bg-slate-50 ${total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {total.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-900">Saldo Operacional</td>
                  {monthlyTotals.map((v, i) => (
                    <td
                      key={i}
                      className={`text-right px-3 py-3 ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {v !== 0 &&
                        v.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                    </td>
                  ))}
                  <td
                    className={`text-right px-4 py-3 bg-slate-100 ${monthlyTotals.reduce((a, b) => a + b, 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {monthlyTotals
                      .reduce((a, b) => a + b, 0)
                      .toLocaleString('pt-BR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                  </td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-100 font-bold">
                  <td className="px-4 py-3 text-slate-900">Saldo Acumulado</td>
                  {cumulativeTotals.map((v, i) => (
                    <td
                      key={i}
                      className={`text-right px-3 py-3 ${v >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                      {v !== 0 &&
                        v.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                    </td>
                  ))}
                  <td className="text-right px-4 py-3 bg-slate-200 text-slate-900">
                    {(cumulativeTotals[cumulativeTotals.length - 1] || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
