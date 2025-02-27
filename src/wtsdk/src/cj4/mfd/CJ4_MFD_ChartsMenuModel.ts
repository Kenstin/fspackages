import { NG_Chart } from "../../types/navigraph";
import { NavigraphApi } from "../../utils/NavigraphApi";
import { CHART_TYPE, NavigraphChartFilter } from "../../utils/NavigraphChartFilter";

export class CJ4_MFD_ChartsMenuModel {
  private _api: NavigraphApi;
  private _type: CHART_TYPE;
  private _icao: string;
  private _charts: NG_Chart[];

  public get icao(): string {
    return this._icao;
  }

  public get type(): CHART_TYPE {
    return this._type;
  }

  public get charts(): NG_Chart[] {
    return this._charts;
  }

  constructor(icao: string, type: CHART_TYPE, ngApi: NavigraphApi) {
    this._api = ngApi;
    this._icao = icao;
    this._type = type;
  }

  public async init(): Promise<void> {
    const ngCharts = await this._api.getChartsList(this._icao);
    if (ngCharts !== undefined && ngCharts.charts !== undefined) {
      switch (this._type) {
        case CHART_TYPE.AIRPORT:
          this._charts = NavigraphChartFilter.getAirport(ngCharts);
          break;
        case CHART_TYPE.DEPARTURE:
          this._charts = NavigraphChartFilter.getDeparture(ngCharts);
          break;
        case CHART_TYPE.ARRIVAL:
          this._charts = NavigraphChartFilter.getArrival(ngCharts);
          break;
        case CHART_TYPE.APPROACH:
          this._charts = NavigraphChartFilter.getApproach(ngCharts);
          break;
        case CHART_TYPE.AIRSPACE:
          this._charts = NavigraphChartFilter.getAirspace(ngCharts);
          break;
      }
      if (this._charts !== undefined && this._charts.length > 1) {
        // sort
        this._charts = this._charts.sort((a: NG_Chart, b: NG_Chart) => {
          const aMatch = a.index_number.match(/(\d*)-(\d*)([A-Z])?/);
          const bMatch = b.index_number.match(/(\d*)-(\d*)([A-Z])?/);
          if (aMatch[1] === bMatch[1]) {
            return parseInt(aMatch[2]) - parseInt(bMatch[2]);
          } else {
            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
          }
        });
      }
    }
  }
}