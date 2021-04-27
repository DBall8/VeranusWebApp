import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router'

import { DeviceService } from '../services/device.service'
import { Device } from '../objects/device'

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css']
})
export class MainPageComponent implements OnInit {

  @ViewChild('DeviceName', {static: false}) deviceNameField: ElementRef;
  @ViewChild('DeviceId', {static: false})   deviceIdField: ElementRef;

  data: DeviceService;
  showNewDevicePrompt: boolean;

  constructor(data: DeviceService, private router: Router)
  {
    this.data = data;
    this.showNewDevicePrompt = false;
  }

  ngOnInit() {
    this.data.loadDevices();
  }

  toggleNewDevicePrompt()
  {
    this.showNewDevicePrompt = !this.showNewDevicePrompt;
  }

  addDevice()
  {
    var deviceName: string = this.deviceNameField.nativeElement.value;
    var deviceId: string = this.deviceIdField.nativeElement.value;

    if (!deviceName || !deviceId)
    {
      // Left a field blank, do nothing
      return;
    }

    this.data.addDevice(deviceName, deviceId).subscribe((res) =>
    {
      if (res.body && res.body.success)
      {
        this.showNewDevicePrompt = false;
        this.data.loadDevice(deviceId, deviceName);
      }
    })
  }

  openDevice(device: Device)
  {
    this.router.navigate(['/device', device.id]);
  }
}
