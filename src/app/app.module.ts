import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider'

import { AppComponent } from './app.component';
import { LoginPageComponent } from './login-page/login-page.component';
import { AppRoutingModule } from './app-routing.module';
import { MainPageComponent } from './main-page/main-page.component';
import { DevicePageComponent } from './device-page/device-page.component';
import { DeviceSettingsPageComponent } from './device-settings-page/device-settings-page.component';
import { DeviceBarComponent } from './device-bar/device-bar.component';
import { TimestampComponent } from './timestamp/timestamp.component';
import { DataViewComponent } from './data-view/data-view.component';
import { DataGraphComponent } from './data-graph/data-graph.component';
import { CavyCamComponent } from './cavy-cam/cavy-cam.component';
import { RangeSliderComponent } from './range-slider/range-slider.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent,
    LoginPageComponent,
    MainPageComponent,
    DevicePageComponent,
    DeviceSettingsPageComponent,
    DeviceBarComponent,
    TimestampComponent,
    DataViewComponent,
    DataGraphComponent,
    CavyCamComponent,
    RangeSliderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    MatSliderModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
