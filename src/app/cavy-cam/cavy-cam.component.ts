import { Component, OnInit } from '@angular/core';
import { DeviceService } from '../services/device.service';

@Component({
  selector: 'app-cavy-cam',
  templateUrl: './cavy-cam.component.html',
  styleUrls: ['./cavy-cam.component.css']
})
export class CavyCamComponent implements OnInit {

  constructor(private deviceService: DeviceService) { }

  ngOnInit() {
  }

  getCapture()
  {
    this.deviceService.capture().subscribe((response: any) =>
    {
        if (this.deviceService.isSessionExpired(response))
        {
            return;
        }
        
        if (!response || !response.body || !response.body.success)
        {
            alert("Capture faile, try again later.");
            return;
        }

        // reload to see new image
        location.reload();
    });
  }

}
