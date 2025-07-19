'use client'

import { Card } from '@/components/ui/Card'

export function GenerationInstructions() {
  return (
    <Card className="mt-6 p-6 bg-yellow-50 border-yellow-200">
      <h3 className="font-semibold text-yellow-900 mb-3">Instrucțiuni Generare Gărzi</h3>
      <ul className="text-sm text-yellow-800 space-y-2">
        <li>• <strong>Rezervările sunt prioritare</strong> - personalul care a rezervat zile preferate va fi luat în considerare</li>
        <li>• <strong>Distribuție echitabilă</strong> - algoritmul asigură o distribuție corectă a gărzilor</li>
        <li>• <strong>Restricții departamentale</strong> - doar personalul din departamentul selectat va fi inclus</li>
        <li>• <strong>Generarea suprascrie</strong> programul existent pentru luna selectată</li>
        <li>• <strong>Verifică rezultatele</strong> în secțiunea "Program Gărzi" după generare</li>
      </ul>
    </Card>
  )
}