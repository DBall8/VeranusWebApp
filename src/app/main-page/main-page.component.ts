import { Component, OnInit } from '@angular/core';

import { Reading } from '../objects/reading'

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css']
})
export class MainPageComponent implements OnInit {

  readings: Reading[] =
  [
    new Reading(100, 80, 99, 100),
    new Reading(101, 27, 9910, 234),
  ];

  constructor() { }

  ngOnInit() {
  }

}
