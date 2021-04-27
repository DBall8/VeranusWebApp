import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-timestamp',
  templateUrl: './timestamp.component.html',
  styleUrls: ['./timestamp.component.css']
})
export class TimestampComponent implements OnInit {

  @Input() timeMs: number;
  pm: boolean = false;

  constructor() { }

  ngOnInit() {
  }

  getMonth(timeMs: number): number
  {
    return new Date(timeMs).getMonth() + 1;
  }

  getDay(timeMs: number): number
  {
    return new Date(timeMs).getDate();
  }

  getHour(timeMs: number): number
  {
    var hours: number = new Date(timeMs).getHours();
    this.pm = (hours > 11);
    if (hours > 12) hours = hours - 12;
    if (hours == 0) hours = 12;
    return hours;
  }

  getMinute(timeMs: number): string
  {
    var minutes = new Date(timeMs).getMinutes();
    return (minutes < 10) ? ("0" + minutes.toString()) : minutes.toString();
  }

}
