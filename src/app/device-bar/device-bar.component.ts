import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router'

import { Device } from '../objects/device'

@Component({
  selector: 'app-device-bar',
  templateUrl: './device-bar.component.html',
  styleUrls: ['./device-bar.component.css']
})
export class DeviceBarComponent implements OnInit {

    @Input() device: Device;

    constructor(private router: Router) { }

    ngOnInit() {
    }

    round(val): string
    {
        return parseFloat(val).toFixed(1);
    }

    openDeviceSettings()
    {
        this.router.navigate(['/settings', this.device.id])
    }

}
