import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CavyCamComponent } from './cavy-cam.component';

describe('CavyCamComponent', () => {
  let component: CavyCamComponent;
  let fixture: ComponentFixture<CavyCamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CavyCamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CavyCamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
