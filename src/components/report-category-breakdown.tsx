import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance-utils'

interface CategoryEntry {
  group: string
  category: string
  amount: number
}

interface ReportCategoryBreakdownProps {
  data: CategoryEntry[]
}

export function ReportCategoryBreakdown({ data }: ReportCategoryBreakdownProps) {
  const grouped: Record<string, { category: string; amount: number }[]> = {}
  data.forEach((d) => {
    if (!grouped[d.group]) grouped[d.group] = []
    grouped[d.group].push({ category: d.category, amount: d.amount })
  })

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800">
          Detalhamento por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length > 0 ? (
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">
                    Grupo / Categoria
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([group, cats]) => {
                    const groupTotal = cats.reduce((s, c) => s + c.amount, 0)
                    return (
                      <GroupRows
                        key={group}
                        group={group}
                        categories={cats}
                        groupTotal={groupTotal}
                      />
                    )
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">Sem dados para o período selecionado</div>
        )}
      </CardContent>
    </Card>
  )
}

function GroupRows({
  group,
  categories,
  groupTotal,
}: {
  group: string
  categories: { category: string; amount: number }[]
  groupTotal: number
}) {
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-50/50">
        <td className="px-4 py-2 font-semibold text-slate-800">{group}</td>
        <td className="px-4 py-2 text-right font-semibold text-red-600">
          {formatCurrency(groupTotal)}
        </td>
      </tr>
      {categories
        .sort((a, b) => b.amount - a.amount)
        .map((c) => (
          <tr key={c.category} className="border-t border-slate-100 hover:bg-slate-50">
            <td className="px-4 py-2 pl-8 text-slate-600">{c.category}</td>
            <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(c.amount)}</td>
          </tr>
        ))}
    </>
  )
}
