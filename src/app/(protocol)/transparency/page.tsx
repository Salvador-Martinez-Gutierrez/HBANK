import CapitalAllocationCard from "./components/capital-allocation-card"
import InstantRedemptionCard from "./components/instant-redeption-card"
import ReportsCard from "./components/reports-card"

export default function TransparencyPage() {
  return (
    <div className="h-full p-8">
      <h1 className="text-3xl font-bold text-foreground">Transparency</h1>
      <p className="text-muted-foreground mt-2">View transparency data and reports for the hUSD token.</p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        This page displays mock data for demonstration purposes only.
      </div>

      <div className="my-8">
        <CapitalAllocationCard />
        <div className="py-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ReportsCard />
          <InstantRedemptionCard />
        </div>
      </div>

    </div>
  )
}
