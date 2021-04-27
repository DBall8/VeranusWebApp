import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceBarComponent } from './device-bar.component';

describe('DeviceBarComponent', () => {
  let component: DeviceBarComponent;
  let fixture: ComponentFixture<DeviceBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeviceBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
