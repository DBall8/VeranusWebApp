import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceSettingsPageComponent } from './device-settings-page.component';

describe('DeviceSettingsPageComponent', () => {
  let component: DeviceSettingsPageComponent;
  let fixture: ComponentFixture<DeviceSettingsPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceSettingsPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceSettingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
