# Triagem independente e revisão do HTML

Referência: `assistente_de_triagem_copom_190(1).html`, recebido no chat. Revisão: 14/11/2026.

## Escopo

- Removidos descoberta, recebimento de resultados/pendências, publicação de análises, configurações, indicadores e download da extensão Relato 190.
- Preservados chat manual, análise de relatos, catálogo, documentação, gestão de piso, qualidade e administração. Não havia endpoint exclusivo da extensão: `/chat` e `/analyze` permanecem compartilhados pelo site, com sessão e origem obrigatórias.
- Alterações em branch separada para não atualizar a produção pela integração automática de `main`.

## Referência e catálogo

O HTML foi lido como texto, sem execução de seus scripts. Seus mecanismos de voz ativa/passiva, correferência, edição de papéis e sondagem orientaram a revisão do motor existente. Foram comparados seus 769 pares ID/título ao catálogo corrigido do repositório: todos os IDs existem; 768 títulos são idênticos. O ID 766 usa “ECONÔMICO” no HTML e “ECONÔMICA” no CSV corrigido. O CSV existente foi preservado. IDs NAT são identificadores internos, não certificação oficial dos códigos.

O motor agora reconhece também primeira pessoa e voz progressiva, evita atribuir papéis a condutas negadas/incertas e não presume que o familiar do comunicante tenha vínculo familiar com a pessoa atingida. A edição manual usa valores permitidos no servidor, identifica a intervenção do operador e recalcula resumo, sugestões e perguntas mantendo o texto original. Corrigir vítima/autor exige reconfirmar o vínculo doméstico.

## Limites de interpretação

- Pontuação de compatibilidade exibida em escala de 100, sem aparência de probabilidade calibrada.
- Armas geram sinais de risco; sua simples menção não sugere porte ilegal nem roubo agravado.
- Agressão sem informação sobre ferimentos não equivale a ausência de lesões. Vias de fato exige negativa explícita de ferimentos para a sugestão automática.
- Correspondência lexical respeita negativas e incertezas; qualificadoras não surgem por mera coincidência de palavras.
- Resultados distinguem situação desconhecida, hipóteses a conferir e eventos sem indício criminal confirmado. Risco e informação incerta/contraditória são apresentados separadamente. Ausência de hipótese não significa ausência de risco ou certeza de inexistência de crime.
- Até cinco perguntas essenciais ainda pendentes; seleção continua determinística e sem Gemini. A classificação e os papéis são sugestões que exigem confirmação humana.

## Conferência jurídica

As descrições jurídicas e conclusões táticas categóricas do HTML não foram transplantadas. Em particular, não foram reutilizadas afirmações de concurso automático de crimes, prioridade máxima de despacho ou configuração de descumprimento por qualquer aproximação. Foram consultadas fontes primárias para delimitar esses riscos:

- [Código Penal atualizado, Câmara dos Deputados](https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-2848-7-dezembro-1940-412868-normaatualizada-pe.html): os arts. 147, 150 e 157 exigem elementos próprios. Estar diante de um imóvel não demonstra, isoladamente, ingresso/permanência ilícita; uma arma mencionada em outra parte do relato não comprova seu emprego na subtração. O motor mantém hipóteses condicionais, sem afirmar consumação ou concurso.
- [Lei 11.340 atualizada, Câmara dos Deputados](https://www2.camara.leg.br/legin/fed/lei/2006/lei-11340-7-agosto-2006-545133-normaatualizada-pl.html): a hipótese do art. 24-A depende do conteúdo da decisão judicial. O texto do HTML sobre aproximação/contato não foi reutilizado como regra universal; a sugestão exige relato explícito de descumprimento e pede conferência da decisão e da conduta.
- [STF, Tema 857](https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?classeProcesso=ARE&incidente=4811977&numeroProcesso=901623&numeroTema=857): o exame do porte de arma branca depende das circunstâncias concretas. A presença de faca/facão não aciona automaticamente a natureza de porte ilegal.

Esta revisão delimita o reaproveitamento do protótipo; não homologa todo o catálogo ou substitui protocolos institucionais.

## Verificação

`npm test`: regressões de relatos e demais funcionalidades, incluindo novos casos de papéis, correções, negações, incertezas, risco e inferências indevidas. O teste React com DOM simulado monta a página, injeta os antigos eventos da extensão e confirma ausência de efeito/transmissão, depois envia relato no chat e aplica uma correção com recálculo. As respostas HTTP desse teste usam o motor local com transporte simulado; não utiliza banco ou produção. Componentes de áreas não envolvidas são substituídos no teste de interface, mas suas suites próprias permanecem na execução completa.

`npm run build`: compilação e geração Next.js. Nenhuma implantação de produção faz parte desta alteração.
