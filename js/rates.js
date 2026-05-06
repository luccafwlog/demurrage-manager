// ============================================================
// rates.js — Tabela RATES, getRate(), getRateForBL(), calcUSD()
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Sem dependências externas. Funções puras de cálculo D&D.
// ============================================================

// ============================================================
// RATE TABLE — BRASIL, DIAS CORRIDOS desde a descarga
// ============================================================
// DE/PARA de tipos de contêiner → categoria de taxa
// 20GP = qualquer variação de 20 pés GP/HC/standard
// 40GP = qualquer variação de 40/45 pés GP/HC/standard (inclui 45G1=40HC, 22G1=20GP tratado abaixo)
const RATES = [
  { type:'20GP/HC',
    aliases:[
      '20GP','20G0','20G1','20G2',         // GP standard
      '22G0','22G1','22G2',                 // 22G1 = 20GP
      '20HC','20HQ','20HO',                 // High Cube 20
      '20GP/HC','20ST',
    ],
    freeUntil:21, p1:{range:[22,30],usd:30}, p2:{range:[31,Infinity],usd:50} },

  { type:'40GP/HC',
    aliases:[
      '40GP','40G0','40G1','40G2',          // GP 40
      '42G0','42G1','42G2',                 // variações 40GP
      '40HC','40HQ','40HO',                 // High Cube 40
      '45G0','45G1','45G2','45GP','45HC',   // 45G1 = 40HC
      '40GP/HC','40ST',
    ],
    freeUntil:21, p1:{range:[22,30],usd:60}, p2:{range:[31,Infinity],usd:80} },

  { type:'20FR/OT',
    aliases:[
      '20FR','20F0','20F1',                 // Flat Rack 20
      '20OT','20O0','20O1','20P0','20P1',   // Open Top 20 / Platform
      '20FR/OT',
    ],
    freeUntil:21, p1:{range:[22,30],usd:50}, p2:{range:[31,Infinity],usd:80} },

  { type:'40FR/OT',
    aliases:[
      '40FR','40F0','40F1',                 // Flat Rack 40
      '40OT','40O0','40O1','40P0','40P1',   // Open Top 40 / Platform
      '45FR','45OT',
      '40FH_45P3','40FR_42P3',              // variações ISO cadastradas como FR/OT
      '40FR/OT',
    ],
    freeUntil:21, p1:{range:[22,30],usd:100}, p2:{range:[31,Infinity],usd:140} },

  { type:'20RF/RQ',
    aliases:[
      '20RF','20R0','20R1','20R2',          // Reefer 20
      '20RQ','20RH',                        // Reefer HC 20
      '20RF/RQ',
    ],
    freeUntil:10, p1:{range:[11,19],usd:95}, p2:{range:[20,Infinity],usd:110} },

  { type:'40RF/RQ',
    aliases:[
      '40RF','40R0','40R1','40R2',          // Reefer 40
      '40RQ','40RH',                        // Reefer HC 40
      '45RF','45RQ','45R0','45R1',          // Reefer 45
      '40RF/RQ',
    ],
    freeUntil:10, p1:{range:[11,19],usd:190}, p2:{range:[20,Infinity],usd:220} },
];

function getRate(typeStr) {
  if (!typeStr) return RATES[1];
  const t = typeStr.toUpperCase().trim().replace(/[\s\-\/_]+/g,'');
  const exact = RATES.find(r => r.aliases.some(a => a.replace(/[\s\-\/_]+/g,'') === t));
  if (exact) return exact;
  const prefix = RATES.find(r => r.aliases.some(a => t.startsWith(a.replace(/[\s\-\/_]+/g,''))));
  if (prefix) return prefix;
  return RATES[1];
}

// Retorna a rate do tipo de container, sobrescrevendo freeUntil com o free time
// negociado do BL quando ele for diferente do padrão da tabela.
function getRateForBL(bl, typeStr) {
  const base = getRate(typeStr);
  const blFreeTime = bl && bl.freeTime != null ? parseInt(bl.freeTime, 10) : NaN;
  if (!isNaN(blFreeTime) && blFreeTime >= 0 && blFreeTime !== base.freeUntil) {
    // Ajusta os ranges das faixas para manter consistência com o novo freeUntil.
    // Faixa P1 começa no dia seguinte ao fim do free time.
    const p1Start = blFreeTime + 1;
    const p1End   = blFreeTime + (base.p1.range[1] - base.p1.range[0] + 1);
    const p2Start = p1End + 1;
    return Object.assign({}, base, {
      freeUntil: blFreeTime,
      p1: { range: [p1Start, p1End], usd: base.p1.usd },
      p2: { range: [p2Start, Infinity], usd: base.p2.usd }
    });
  }
  return base;
}

// dc = dias corridos (Data Retorno - Data Descarga)
// Returns { dc, diasP1, diasP2, usdP1, usdP2, totalUSD }
function calcUSD(dc, rate, ov1, ov2) {
  if (!rate || dc <= 0) return { dc:0, diasP1:0, diasP2:0, usdP1:rate?.p1.usd||0, usdP2:rate?.p2.usd||0, totalUSD:0 };
  const usdP1 = ov1 != null ? ov1 : rate.p1.usd;
  const usdP2 = ov2 != null ? ov2 : rate.p2.usd;
  if (dc <= rate.freeUntil) return { dc, diasP1:0, diasP2:0, usdP1, usdP2, totalUSD:0 };
  const diasP1 = dc <= rate.p1.range[1] ? dc - rate.p1.range[0] + 1 : rate.p1.range[1] - rate.p1.range[0] + 1;
  const diasP2 = dc >= rate.p2.range[0] ? dc - rate.p2.range[0] + 1 : 0;
  const clampedP1 = Math.max(0, diasP1);
  const totalUSD = clampedP1 * usdP1 + diasP2 * usdP2;
  return { dc, diasP1: clampedP1, diasP2, usdP1, usdP2, totalUSD };
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  return Math.max(0, Math.round((new Date(d2+'T12:00:00') - new Date(d1+'T12:00:00')) / 86400000));
}


