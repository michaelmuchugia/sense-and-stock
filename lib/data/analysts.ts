import type { Analyst } from '@/lib/types/analyst'

export const ANALYSTS: Analyst[] = [
  {id:1,nm:'Ngugi Waweru',ini:'NW',firm:'Faida Investment Bank',stocks:['SCOM','EQTY','KCB','COOP','KEGN','KPLC','JUB'],hit:72.4,ret:26.8,days:198,score:2.18,targets:68,since:'2018',
   bio:`Ngugi Waweru is a research analyst at Faida Investment Bank (FIB), quoted in The East African newspaper on NSE 2024 performance. He specialises in banking and energy stocks. His October and November 2025 stock picks included Co-op Bank (BUY, KES 22→KES 25), KPLC (BUY), KCB (BUY, KES 69→KES 75), and Equity (HOLD, KES 69.75→KES 74.50).`},
  {id:2,nm:'FIB Research Team',ini:'FT',firm:'Faida Investment Bank',stocks:['COOP','KPLC','EQTY','KCB','CIC','KEGN','JUB','BAT','DTK','IMH','LBTY','EABL'],hit:69.8,ret:24.2,days:210,score:1.98,targets:82,since:'2017',
   bio:`Faida Investment Bank Research Team. Africa's Future Funded. Authors of the monthly NSE Stock Picks reports (October 2025, November 2025). Coverage includes 12+ counters across banking, insurance, energy and consumer goods. Portfolio hit 4.9% weighted return in October 2025.`},
  {id:3,nm:'AIB-AXYS Research Team',ini:'AT',firm:'AIB-AXYS Africa',stocks:['ABSA','DTK','NCBA','KCB','IMH','COOP','EQTY','SCOM','BRIT','JUB'],hit:68.2,ret:22.6,days:215,score:1.87,targets:74,since:'2016',
   bio:`AIB-AXYS Africa Research Team — monthly NSE Stock Recommendations (December 2024 most recently published). Coverage focuses on the top 40 NSE counters. The team covers all major banking stocks (DTK, NCBA, KCB, I&M, ABSA, COOP, EQTY) and publishes quarterly outlook reports.`},
  {id:4,nm:'NCBA IB Research Team',ini:'NT',firm:'NCBA Investment Bank',stocks:['KCB','EQTY','NCBA','COOP','ABSA','SCOM','KPLC','KEGN','BAT'],hit:66.4,ret:21.8,days:224,score:1.82,targets:62,since:'2019',
   bio:`NCBA Investment Bank Research Team. NCBA-IB publishes monthly Stock Picks (Jan–May 2025 editions confirmed). Coverage maintains preference for fundamentally strong companies trading at a discount to intrinsic value, with a focus on banking stocks and select counters with strong balance sheets.`},
  {id:5,nm:'Caleb Mugendi',ini:'CM',firm:'Genghis Capital',stocks:['SCOM','ABSA','EQTY','KCB','BRIT','KNRE'],hit:71.2,ret:25.4,days:206,score:2.04,targets:48,since:'2019',
   bio:`Caleb Mugendi is Investment Manager at Genghis Capital, featured in media commentary on NSE performance. Hosts the Genghis Weekly Cross-Asset Strategy Report video series on CNBC Africa. Coverage emphasises the top 40 NSE counters with a focus on liquidity and earnings momentum.`},
  {id:6,nm:'Genghis Research Team',ini:'GT',firm:'Genghis Capital',stocks:['ABSA','SCOM','COOP','BRIT','DTK','NCBA','IMH','SLAM'],hit:67.6,ret:22.0,days:218,score:1.79,targets:55,since:'2018',
   bio:`Genghis Capital Research Team. Award-winning research team with sector specialisations. Produces Genghis Weekly Cross-Asset Strategy covering equity and fixed income trading ideas. Issued BUY on Absa Bank Kenya following 2023 results with 12% EPS growth noted. Focus on top 40 NSE counters.`},
  {id:7,nm:'Sterling Capital Research',ini:'SC',firm:'Sterling Capital',stocks:['SCOM','KCB','EQTY','BAMB','CRWN','TOTL','KPC'],hit:64.8,ret:20.2,days:228,score:1.71,targets:42,since:'2018',
   bio:`Sterling Capital Research Team — designated market maker in NSE's NEXT Derivatives Market from 2025. Coverage covers equity trading and fixed income with a focus on fundamentals-based stock picking. Team publishes corporate broking research on major NSE counters.`},
  {id:8,nm:'SIB Research Team',ini:'SI',firm:'Standard Investment Bank',stocks:['SCOM','EQTY','KCB','EABL','BAT','SCBK','COOP'],hit:67.2,ret:23.6,days:202,score:1.88,targets:51,since:'2016',
   bio:`Standard Investment Bank Research Team. One of the original NSE licensed brokerages with 25+ years in the market. Coverage emphasises large-cap NSE stocks with strong dividend profiles. Known for in-depth quarterly and annual research reports.`},
  {id:9,nm:'AIB-AXYS Equity Desk',ini:'AE',firm:'AIB-AXYS Africa',stocks:['EABL','KUKZ','SASN','BAT','UNGA','CARB','WTK'],hit:62.4,ret:19.8,days:248,score:1.56,targets:34,since:'2020',
   bio:`AIB-AXYS Africa Equity Desk covers consumer goods, agricultural and manufacturing stocks alongside the core banking coverage. The team has over 25 years of combined experience in the NSE securities market.`},
  {id:10,nm:'Faida Fixed Income Desk',ini:'FF',firm:'Faida Investment Bank',stocks:['KPC','TOTL','KPLC','KEGN','UMME'],hit:58.6,ret:18.4,days:288,score:1.38,targets:28,since:'2018',
   bio:`Faida Investment Bank Fixed Income and Energy Desk covers energy and utilities stocks. Regular issuer of macro and fixed income reports, including monthly fixed income analysis and quarterly East Africa macroeconomic reports. Covered KenGen FY2025 results (PAT +54.2% to KES 10.5bn).`},
  {id:11,nm:'Suntra Research Team',ini:'SR',firm:'Suntra Investment',stocks:['SCOM','KCB','COOP','IMH','KNRE','CIC'],hit:61.8,ret:19.2,days:235,score:1.52,targets:32,since:'2019',
   bio:`Suntra Investment Bank research desk. One of Kenya's licensed NSE stockbrokers, providing equity research and investment advisory services. Coverage has a focus on mid-cap and undervalued NSE counters.`},
  {id:12,nm:'ABC Capital Research',ini:'AC',firm:'ABC Capital',stocks:['EQTY','KCB','SCOM','JUB','BAT'],hit:60.2,ret:18.8,days:244,score:1.48,targets:26,since:'2020',
   bio:`ABC Capital is a licensed NSE stockbroker providing equity research and investment advisory services. Coverage focuses on large-cap dividend-paying stocks.`},
  {id:13,nm:'Old Mutual Securities',ini:'OM',firm:'Old Mutual Securities Kenya',stocks:['SCOM','EQTY','KCB','BRIT','CIC','LBTY'],hit:62.0,ret:20.4,days:232,score:1.62,targets:30,since:'2017',
   bio:`Old Mutual Securities Kenya provides institutional and retail equity brokerage with strong insurance sector coverage given the parent company's insurance background in East Africa.`},
  {id:14,nm:'NCBA IB Equity',ini:'NE',firm:'NCBA Investment Bank',stocks:['IMH','DTK','SBIC','NCBA','BKG'],hit:60.8,ret:17.6,days:252,score:1.38,targets:22,since:'2021',
   bio:`NCBA Investment Bank Equity team covers tier-2 and regional banking stocks. Particularly strong on NCBA Group, I&M Holdings, Stanbic Holdings and DTB Kenya.`},
  {id:15,nm:'Genghis Fixed Income',ini:'GF',firm:'Genghis Capital',stocks:['KQ','NMG','UCHM','PORT','CABL'],hit:48.4,ret:12.6,days:318,score:0.92,targets:16,since:'2022',
   bio:`Genghis Capital Fixed Income and Special Situations team covers less liquid and distressed NSE counters. Coverage of Kenya Airways and restructuring-phase companies.`},
  {id:16,nm:'Sterling Capital Equity',ini:'SE',firm:'Sterling Capital',stocks:['OCH','CTUM','HAFR','TCL','NSE'],hit:50.6,ret:14.8,days:295,score:0.97,targets:18,since:'2021',
   bio:`Sterling Capital Equity team covers investment companies and GEMS-listed counters. With Sterling's appointment as NSE derivatives market maker in 2025, the team has deepened its market structure knowledge.`},
]

export function getAnalystById(id: number): Analyst | undefined {
  return ANALYSTS.find(a => a.id === id)
}

export function getAnalystsForStock(symbol: string): Analyst[] {
  return ANALYSTS.filter(a => a.stocks.includes(symbol))
}
