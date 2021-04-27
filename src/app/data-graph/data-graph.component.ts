import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';

import { Chart } from 'chart.js'

const DEFAULT_STEP_SIZE: number = 12;
const DAY_STEP_SIZE: number = 1;
const MONTH_STEP_SIZE: number = 1;

const DEFAULT_GRAPH_LABEL: string = "MMM D hA";
const DAY_GRAPH_LABEL: string = "hA";

const DEFAULT_UNIT = "hour";
const MONTH_UNIT = "day";

@Component({
  selector: 'app-data-graph',
  templateUrl: './data-graph.component.html',
  styleUrls: ['./data-graph.component.css']
})
export class DataGraphComponent implements OnInit {

  @Input() title: string;
  @Input() data: any[];
  @Input() value: string;
  @Input() color: string = 'black';

  @Input() update: boolean;

  @ViewChild('graph', {static: true}) private graphElement;
  @ViewChild('range', {static: true}) private rangeElement;

  // Graph
  chart: any;

  // Graph values/settings
  displayedData: any[] = [];
  dateRange: number = 0;

  xAxesSetting: any;
  chartOptions: any;

  constructor() {
   }

  ngOnInit() {
      this.chartOptions = 
      {
        type: 'line',
        data: {
          datasets:
          [
            {
              label: this.title,
              backgroundColor: this.color,
              borderColor: this.color,
              data: this.displayedData,
            }
          ]
        },
        options: {
          legend: { display: false },
          scales: {
              xAxes: [{
                  ticks: {
                      fontColor: "black",
                      fontSize: 12,
                  },
                  type: 'time',
                  time:
                  {
                      unit: MONTH_UNIT,
                      unitStepSize: MONTH_STEP_SIZE,
                      displayFormats:
                      {
                          hour: DEFAULT_GRAPH_LABEL,
                          day: "MMM D"
                      },
                  },
                  position: 'bottom'
              }],
              yAxes: [{
                  ticks: {
                      fontColor: "black",
                      fontSize: 18,
                      suggestedMin: 0,
                      suggestedMax: 100
                  },
              }]
          }
        }
      };
    this.chart = new Chart(this.graphElement.nativeElement, this.chartOptions);
  }

    ngOnChanges()
    {
        this.updateChart();
    }

    updateChart()
    {
        if (this.chart && (this.data.length > 0) && this.value)
        {
            this.displayedData.length = 0;
            for (var i=0; i<this.data.length; i++)
            {
                if (this.data[i].timestamp >= this.dateRange)
                {
                    this.displayedData.push({x: this.data[i].timestamp, y: this.data[i][this.value]});
                }
            }
            this.chart.update();
        }
    }

    changeRange()
    {
        var date: Date = new Date(Date.now());
        var selectedValue = this.rangeElement.nativeElement.value;
        switch (selectedValue)
        {
            case "1day":
            {
                date.setDate(date.getDate() - 1);
                break;
            }
            case "3day":
            {
                date.setDate(date.getDate() - 3);
                break;
            }
            case "1week":
            {
                date.setDate(date.getDate() - 7);
                break;
            }
            case "1month":
            {
                date.setMonth(date.getMonth() - 1);
                break;
            }
            case "3month":
            {
                date.setMonth(date.getMonth() - 3);
                break;
            }
            default:
            case "all":
            {
                date.setTime(0);
                break;
            }
        }

        if (selectedValue === "1day")
        {
            this.chartOptions.options.scales.xAxes[0].time.unitStepSize = DAY_STEP_SIZE;
            this.chartOptions.options.scales.xAxes[0].time.displayFormats.hour = DAY_GRAPH_LABEL;
            this.chartOptions.options.scales.xAxes[0].time.unit = DEFAULT_UNIT;
        }
        else if (selectedValue === "1month" ||
                 selectedValue === "3month" ||
                 selectedValue === "all")
        {
            this.chartOptions.options.scales.xAxes[0].time.unitStepSize = MONTH_STEP_SIZE;
            this.chartOptions.options.scales.xAxes[0].time.displayFormats.hour = DEFAULT_GRAPH_LABEL;
            this.chartOptions.options.scales.xAxes[0].time.unit = MONTH_UNIT;
        }
        else
        {
            this.chartOptions.options.scales.xAxes[0].time.unitStepSize = DEFAULT_STEP_SIZE;
            this.chartOptions.options.scales.xAxes[0].time.displayFormats.hour = DEFAULT_GRAPH_LABEL;
            this.chartOptions.options.scales.xAxes[0].time.unit = DEFAULT_UNIT;
        }

        this.dateRange = date.getTime();
        this.updateChart();
    }

}
