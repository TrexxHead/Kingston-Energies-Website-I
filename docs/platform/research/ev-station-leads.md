# EV charging station leads (research, 12 Oct 2026)

**These are leads, not registry entries.** Each was named in a public source, but none has a confirmed exact location, connector set or current operating state. Enter one in **Admin → Energy platform → Map stations** only after someone confirms it: a site visit, the site owner, or the operator. Record that confirmation as the source with source type `field_visit` / `site_owner` / `operator_public`.

Public facts (location, connectors, hours) can be published with attribution. **Live availability is not published on any public page we found.** JPS directs drivers to the ChargeLab app, and Evergo to its own app. Pulling status from those apps' private backends would break their terms and could show stale data as live. The legitimate live-status routes are Google Places `evChargeOptions` (needs the server key), or an operator feed/export.

Research limits: jpsco.com and evergo.com could not be fetched from the build environment, so this list comes from search results and news coverage. Re-check the operators' own pages directly.

## Network size (as publicly stated)

| Network | Stated size | Source |
|---|---|---|
| JPS Charge 'n Go | 45 chargers islandwide (July 2026) | [JPS release, Jul 2026](https://www.jpsco.com/jps-offers-free-charging-at-all-jps-charge-n-go-stations-this-independence-and-emancipation-day/) |
| Evergo Jamaica | ~70 charging stations, 10 in St James (Mar 2025) | [Jamaica Observer, Mar 2025](https://www.jamaicaobserver.com/2025/03/13/ev-charging-stations-coming/) |

## Leads

| Lead | Parish | Network | What the source says | Confidence | Source |
|---|---|---|---|---|---|
| TotalEnergies, Salem, Runaway Bay | St. Ann | JPS | Open; 4 charging points, "240 kW" | Operator release (2026) | [JPS release, Jul 2026](https://www.jpsco.com/jps-offers-free-charging-at-all-jps-charge-n-go-stations-this-independence-and-emancipation-day/) |
| Harbour City Mall, Montego Bay | St. James | JPS | Open; 4 charging points | Operator release (2026) | [JPS release, Jul 2026](https://www.jpsco.com/jps-offers-free-charging-at-all-jps-charge-n-go-stations-this-independence-and-emancipation-day/) |
| Drax Hall | St. Ann | JPS | First JPS public station (2021) | News (2021) — confirm still operating | [Jamaica Observer, May 2021](https://www.jamaicaobserver.com/2021/05/08/jps-opens-first-public-electric-vehicle-charging-station/), [JIS](https://jis.gov.jm/radio_programs/charge-n-go-jamaicas-first-ev-charging-station-commissioned/) |
| TotalEnergies Ironshore, Montego Bay | St. James | JPS | 4 bays | Open Charge Map, not recently verified | [OCM-273909](https://openchargemap.io/poi/details/273909) |
| TotalEnergies Discovery Bay | St. Ann | JPS | 3 bays | Open Charge Map, not recently verified | [OCM-273910](https://beta.openchargemap.org/poi/details/273910) |
| TotalEnergies Old Harbour | St. Catherine | JPS | Listed as "JPS Charge & Go" | PlugShare listing | [PlugShare 1411953](https://www.plugshare.com/location/1411953) |
| Harbour View (TotalEnergies, Poor Man's Corner) | St. Andrew / St. Thomas — confirm | JPS | Named in 2023 reports / OCM | News 2023 + OCM | [Gleaner, Jun 2023](http://past.jamaica-gleaner.com/article/business/20230614/jps-install-12-more-ev-stations-year), [OCM operator list](https://www.openchargemap.org/poi?CountryIds=113&OperatorIds=3621) |
| Manor Park | St. Andrew | JPS | Named in 2023 report | News 2023 | [Gleaner, Jun 2023](http://past.jamaica-gleaner.com/article/business/20230614/jps-install-12-more-ev-stations-year) |
| Spanish Court Hotel, New Kingston | St. Andrew | JPS | **Planned** (2023) | Plan only | [Gleaner, Jun 2023](http://past.jamaica-gleaner.com/article/business/20230614/jps-install-12-more-ev-stations-year) |
| Juici Patties, Clarendon Park | Clarendon | JPS | **Planned** (2023) | Plan only | [Gleaner, Jun 2023](http://past.jamaica-gleaner.com/article/business/20230614/jps-install-12-more-ev-stations-year) |
| Go Gas Mart, Mandeville (×2) | Manchester | JPS | **Planned** (2023) | Plan only | [Gleaner, Jun 2023](http://past.jamaica-gleaner.com/article/business/20230614/jps-install-12-more-ev-stations-year) |
| Texaco Ironshore, Montego Bay | St. James | Evergo | Commissioned Feb 2022 | News 2022 | [Gleaner, Aug 2022](https://web4.jamaica-gleaner.com/article/lead-stories/20220810/evergo-eyes-150-ev-charging-stations-year-end) |
| Pier One, Montego Bay | St. James | Evergo | Named site | News | [Gleaner, Aug 2022](https://web4.jamaica-gleaner.com/article/lead-stories/20220810/evergo-eyes-150-ev-charging-stations-year-end) |
| Jamaica Inn, Ocho Rios | St. Ann | Evergo | First hotel in network (likely guests/customers only — confirm access) | News | [Gleaner, Feb 2022](https://web4.jamaica-gleaner.com/article/business/20220220/evergo-adds-resort-charging-network-mulls-apartment-complexes), [JamEnergy](https://www.jamenergy.com/evergo-jamaica-charges-up-gb-energy-texaco-jamaica-inn/) |
| GB Energy / Texaco (location in article) | confirm | Evergo | Named site | News | [JamEnergy](https://www.jamenergy.com/evergo-jamaica-charges-up-gb-energy-texaco-jamaica-inn/) |
| Boot Gas Station, Dunrobin | St. Andrew | Evergo | Early installation | News 2021 | [Gleaner, May 2021](https://web4.jamaica-gleaner.com/article/business/20210514/evergo-jamaica-roll-out-60-ev-charging-station-network) |
| Richmond | St. Mary — confirm | Evergo | Early installation | News 2021 | [Gleaner, May 2021](https://web4.jamaica-gleaner.com/article/business/20210514/evergo-jamaica-roll-out-60-ev-charging-station-network) |
| Texaco, Portmore | St. Catherine | Evergo | **Planned** (2021) | Plan only | [Gleaner, May 2021](https://web4.jamaica-gleaner.com/article/business/20210514/evergo-jamaica-roll-out-60-ev-charging-station-network) |

## Aggregators

- **Open Charge Map** has a public API (needs a free key) and lists JPS sites. Licensing differs per contributing source, so check the licence on each record before reuse. Use it to find candidates and spot discrepancies, not as authority.
- **PlugShare** listings are useful leads, but its terms don't allow copying or scraping. Use them only to know where to look.

## Fastest way to fill the map legitimately

1. Email JPS (evsupport@jpsco.com) and Evergo for their current site list with permission to display it. Facts plus attribution are a small ask — far smaller than a live-data API.
2. Meanwhile, staff confirm leads above by visit or phone and enter them as `field_visit` / `site_owner` sources.
3. Add the Google server key: Places `evChargeOptions` gives live counts where Google has them, shown transiently with attribution.
