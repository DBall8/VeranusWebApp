import { Component, OnInit, Input } from '@angular/core';
import { ValueRange } from '../objects/valueRange';

const safeColor: string = '#159715';
const warningColor: string = '#d9d936';
const dangerColor: string = '#dd4f4f';

@Component({
  selector: 'app-data-view',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.css']
})
export class DataViewComponent implements OnInit {
  
  @Input() value: number;
  @Input() label: string;

  @Input() valueRange: ValueRange;

  constructor() { }

  ngOnInit() {
  }

  round(val): string
  {
    return parseFloat(val).toFixed(1);
  }

  getColor()
  {
    if ((this.value < this.valueRange.dangerLow) ||
        (this.value > this.valueRange.dangerHigh))
    {
      return dangerColor;
    }

    if ((this.value < this.valueRange.warningLow) ||
        (this.value > this.valueRange.warningHigh))
    {
      return warningColor;
    }

    return safeColor;
  }
}
