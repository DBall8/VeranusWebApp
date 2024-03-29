import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginPageComponent } from './login-page/login-page.component'
import { MainPageComponent } from './main-page/main-page.component'
import { DevicePageComponent } from './device-page/device-page.component'
import { DeviceSettingsPageComponent } from './device-settings-page/device-settings-page.component'
import { CavyCamComponent } from './cavy-cam/cavy-cam.component';

const routes: Routes =
[
  {path: 'login', component: LoginPageComponent},
  {path: 'device/:deviceId', component: DevicePageComponent},
  {path: 'settings/:deviceId', component: DeviceSettingsPageComponent},
  {path: 'cavycam', component: CavyCamComponent},
  {path: '', component: MainPageComponent},
  {path: '', redirectTo: '/', pathMatch: 'prefix'},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
