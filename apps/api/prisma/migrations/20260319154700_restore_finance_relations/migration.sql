-- AddForeignKey
ALTER TABLE "itens_fatura" ADD CONSTRAINT "itens_fatura_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "faturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "faturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
