const fs = require('fs');
const f = 'app/Actions/Sales/SaleReturn/CreateSaleReturnAction.php';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) { console.error('MISSING', a.slice(0, 80)); process.exit(1); } s = s.replace(a, () => b); };
rep("                $subtotal = round($rawSubtotal - $discountPortion, 2);", "                $subtotal = round($rawSubtotal - $discountPortion + $this->refundableInstallation($saleItem, $quantity), 2);");
rep("    /**\n     * @throws ReturnQuantityExceedsRemainingException\n     */\n    private function assertWithinRemaining", `    /**
     * The installation charge goes back with the goods only while the installation has not been carried out —
     * once its service request is Completed the work was done and the charge stays, so only the goods' value is refunded.
     */
    private function refundableInstallation(SaleItem $saleItem, float $quantity): float
    {
        if (! $saleItem->installation_required || (float) $saleItem->installation_charge <= 0 || (float) $saleItem->quantity <= 0) {
            return 0.0;
        }

        $installed = $saleItem->serviceRequests()
            ->where('type', ServiceRequestType::Installation)
            ->where('status', ServiceRequestStatus::Completed)
            ->exists();

        return $installed ? 0.0 : round((float) $saleItem->installation_charge * $quantity / (float) $saleItem->quantity, 2);
    }

    /**
     * @throws ReturnQuantityExceedsRemainingException
     */
    private function assertWithinRemaining`);
rep("use App\Enums\StockMovementType;", "use App\Enums\ServiceRequestStatus;\nuse App\Enums\ServiceRequestType;\nuse App\Enums\StockMovementType;");
fs.writeFileSync(f, s);
