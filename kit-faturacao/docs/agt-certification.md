# Requisitos de Certificação de Software (AGT Angola)

Para que a ClinicaPlus seja um software legalmente habilitado a emitir facturas em Angola, deve submeter-se ao processo de certificação da AGT.

## Requisitos Técnicos Mandatórios

1. **Assinatura Digital (RSA-2048)**:
   - Todas as facturas e documentos rectificativos devem ser assinados digitalmente.
   - O algoritmo deve ser RSA com SHA-256 (ou superior).
   - A chave privada de assinatura deve estar protegida e ser inacessível à manipulação directa do utilizador.

2. **Cadeia de Integridade (Hash Chaining)**:
   - Documento N depende do Hash do Documento N-1.
   - O primeiro documento de uma série tem o hash anterior como "vazio" ou fixo.
   - Qualquer buraco na numeração ou alteração de um documento anterior invalida toda a cadeia subsequente.

3. **Ficheiro SAF-T AO**:
   - Capacidade de exportar o ficheiro XML conforme a estrutura definida pela Portaria n.º 232/19.

4. **Registo de Eventos (Audit Trail)**:
   - Log interno e inalterável de todas as acções críticas (criação, anulação, exportação).

5. **Interface de Utilizador (UI)**:
   - Exibição clara do número de certificação do software e da versão.
   - Bloqueio de funcionalidades de edição em documentos emitidos.

## Processo de Submissão

1. **Pedido de Certificação**: Submetido via Portal do Contribuinte.
2. **Submissão de Documentação**: Descrição técnica do software, manuais e declaração de conformidade.
3. **Testes de Validação**: A AGT valida a estrutura do SAF-T e a integridade das assinaturas.
4. **Atribuição do Número**: Uma vez aprovado, o software recebe um número único (ex: "X/AGT/2026") que deve constar em todos os rodapés de factura.
