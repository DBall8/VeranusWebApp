import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { ValueRange } from '../objects/valueRange';

const safeColor: string = '#159715';
const warningColor: string = '#d9d936';
const dangerColor: string = '#dd4f4f';

const thumb_spacer: number = 5;

@Component({
  selector: 'app-range-slider',
  templateUrl: './range-slider.component.html',
  styleUrls: ['./range-slider.component.css']
})
export class RangeSliderComponent implements OnInit 
{
    @Input() minVal: number;
    @Input() maxVal: number;
    @Input() valueRange: ValueRange;
    @Input() scale: number = 10;
    @Input() unitLabel: string = "";

    @ViewChild('LineCanvas', {static: false}) canvas:     ElementRef;
    @ViewChild('DLowThumb',  {static: false}) dLowThumb:  ElementRef;
    @ViewChild('WLowThumb',  {static: false}) wLowThumb:  ElementRef;
    @ViewChild('WHighThumb', {static: false}) wHighThumb: ElementRef;
    @ViewChild('DHighThumb', {static: false}) dHighThumb: ElementRef;
    @ViewChild('DLowThumbSelector', {static: false}) dLowThumbSelector: ElementRef;

    context: CanvasRenderingContext2D;

    maxHeight: number;

    thumbStyle: object;
    dLowThumbPosition: object;
    wLowThumbPosition: object;
    wHighThumbPosition: object;
    dHighThumbPosition: object;
    fullObjectStyle: object = {"margin-top": "0px", "margin-bottom": "0px", "display": "inline-block", "width":"100%"};

    activeDrag: string = "none";

    oldThumbOffset = 0;
    oldValueRange = new ValueRange(0,0,0,0);

    constructor() { }

    ngOnInit()
    {
      window.addEventListener("mousemove", (e) => this.handleMouseMove(e));
      window.addEventListener("touchmove", (e) => this.handleTouchMove(e));

      window.addEventListener("mouseup", (e) => this.handleMouseUp());
      window.addEventListener("touchend", (e) => this.handleMouseUp());

      window.addEventListener("resize", (e) => this.handleResize(e));
    }

    ngAfterViewInit(): void {
      this.context = this.canvas.nativeElement.getContext('2d');
      this.canvas.nativeElement.height = this.scale;
      this.canvas.nativeElement.width = this.canvas.nativeElement.offsetWidth;

      this.maxHeight = this.scale;

      this.thumbStyle = this.createThumbStyle();
      this.dLowThumbPosition = this.createThumbPosition("dLow");
      this.wLowThumbPosition = this.createThumbPosition("wLow");
      this.wHighThumbPosition = this.createThumbPosition("wHigh");
      this.dHighThumbPosition = this.createThumbPosition("dHigh");

      this.dLowThumbPosition["z-index"]++;
      this.dHighThumbPosition["z-index"]++;

      this.drawSlider();

      // Shifting makes things look less blurry
      this.context.translate(0.5, 0.5);
    }

    ngDoCheck()
    {
      if (!this.canvas) return;

      var thumbBarHeight = this.dLowThumbSelector.nativeElement.offsetHeight;
      var thumbOffsetDanger = this.maxHeight/2 + 2 + thumbBarHeight/2 - this.getThumb("dLow").nativeElement.offsetHeight;
      if (this.oldThumbOffset != thumbOffsetDanger)
      {
        var thumbOffsetWarning = -this.scale/2;
        this.dLowThumbPosition['top']  = thumbOffsetDanger + "px";
        this.wLowThumbPosition['top']  = thumbOffsetWarning + "px";
        this.wHighThumbPosition['top'] = thumbOffsetWarning + "px";
        this.dHighThumbPosition['top'] = thumbOffsetDanger + "px";

        this.fullObjectStyle["margin-top"] = -thumbOffsetDanger + "px";
        this.fullObjectStyle["margin-bottom"] = -thumbOffsetDanger + "px";

        this.oldThumbOffset = thumbOffsetDanger;
      }

      if (!this.oldValueRange.isEqual(this.valueRange))
      {
        this.updateSlider();
        this.oldValueRange.copy(this.valueRange);
      }
    }

    getThumb(type: string): ElementRef
    {
      switch (type)
      {
        case "dLow":
          return this.dLowThumb;
        case "wLow":
          return this.wLowThumb;
        case "wHigh":
          return this.wHighThumb;
        default:
          return this.dHighThumb;
      }
    }

    getValue(type: string): number
    {
      switch (type)
      {
        case "dLow":
          return this.valueRange.dangerLow;
        case "wLow":
          return this.valueRange.warningLow;
        case "wHigh":
          return this.valueRange.warningHigh;
        case "dHigh":
          return this.valueRange.dangerHigh;
      }

      return 0;
    }

    getMaxWidth(): number
    {
      return this.canvas.nativeElement.offsetWidth - this.scale;
    }

    getPixelPerVal(): number
    {
      return this.getMaxWidth() / (this.maxVal - this.minVal);
    }

    getPixelVal(value: number): number
    {
      return ((value - this.minVal) * this.getPixelPerVal()) + this.scale/2;
    }

    getThumbPixelX(type:string)
    {
      return this.getPixelVal(this.getValue(type)) - this.getThumb(type).nativeElement.offsetWidth/2; // Subtract half the thumb width
    }

    drawLine(pixelStart, pixelEnd, color)
    {
      this.context.fillStyle = color;
      this.context.fillRect(
        pixelStart,
        (this.maxHeight - this.scale) / 2,
        pixelEnd-pixelStart,
        this.scale);
    }

    drawBorder()
    {
      var maxWidth = this.getMaxWidth();
      var halfScale = this.scale/2;
      this.context.strokeStyle = "black";
      this.context.lineWidth = this.scale/8;
      this.context.lineJoin = "round";
      this.context.beginPath();
      this.context.moveTo(halfScale, this.maxHeight/2 - halfScale);
      this.context.lineTo(maxWidth - halfScale, this.maxHeight/2 - halfScale);
      this.context.moveTo(maxWidth - halfScale, this.maxHeight/2 + halfScale);
      this.context.arc(maxWidth - halfScale, this.maxHeight/2, halfScale, Math.PI/2, -Math.PI/2, true);
      this.context.moveTo(maxWidth - halfScale, this.maxHeight/2 + halfScale);
      this.context.lineTo(halfScale, this.maxHeight/2 + halfScale);
      this.context.arc(halfScale, this.maxHeight/2, halfScale, Math.PI/2, -Math.PI/2, false);
      this.context.stroke();
    }

    drawCap(x: number, y: number, clockwise: boolean)
    {
      this.context.beginPath();
      this.context.arc(
        x,
        y,
        this.scale/2,
        Math.PI/2, 3*Math.PI/2,
        clockwise);
      this.context.fill();
    }

    drawSlider()
    {
      var maxWidth = this.getMaxWidth();
      var dLowPixel = this.getPixelVal(this.valueRange.dangerLow);
      var wLowPixel = this.getPixelVal(this.valueRange.warningLow);
      var wHighPixel = this.getPixelVal(this.valueRange.warningHigh);
      var dHighPixel = this.getPixelVal(this.valueRange.dangerHigh);

      this.context.clearRect(0, 0, this.canvas.nativeElement.offsetWidth, this.canvas.nativeElement.offsetHeight);

      // safeRegion
      this.drawLine(wLowPixel, wHighPixel, safeColor);

      // Warning regions
      this.drawLine(dLowPixel, wLowPixel, warningColor);
      this.drawLine(wHighPixel, dHighPixel, warningColor);

      // Danger regions
      this.drawLine(this.scale/2, dLowPixel, dangerColor);
      this.drawLine(dHighPixel, maxWidth + this.scale/2, dangerColor);

      // Draw end caps
      this.drawCap(this.scale/2, this.maxHeight/2, false);
      this.drawCap(maxWidth + this.scale/2, this.maxHeight/2, true);

      // Draw border on the slider
      // this.drawBorder();
    }

    updateSlider()
    {
      this.dLowThumbPosition['left'] = this.getThumbPixelX("dLow") + "px";
      this.wLowThumbPosition['left'] = this.getThumbPixelX("wLow") + "px";
      this.wHighThumbPosition['left'] = this.getThumbPixelX("wHigh") + "px";
      this.dHighThumbPosition['left'] = this.getThumbPixelX("dHigh") + "px";

      this.drawSlider();
    }

    handleMouseDown(event: MouseEvent, type: string)
    {
      event.preventDefault();
      event.stopPropagation();
      this.activeDrag = type;
    }

    handleTouchStart(event: TouchEvent, type: string)
    {
      if (this.activeDrag !== "none")
      {
        this.handleMouseUp();
      }
      event.preventDefault();
      event.stopPropagation();
      this.activeDrag = type;
    }

    handleMouseUp()
    {
      this.activeDrag = "none";
    }

    handleMouseMove(e: MouseEvent)
    {
      e.preventDefault();
      e.stopPropagation();
      if (this.activeDrag === "none")
      {
        return;
      }
      this.handleDrag(e.clientX);
    }

    handleTouchMove(e: TouchEvent)
    {
      e.preventDefault();
      e.stopPropagation();
      if (this.activeDrag === "none")
      {
        return;
      }
      this.handleDrag(e.targetTouches.item(0).clientX);
    }

    handleDrag(xPos: number)
    {
      var sliderX = 0;
      var currentElement = this.canvas.nativeElement;
      while(currentElement)
      {
        sliderX += currentElement.offsetLeft;
        currentElement = currentElement.offsetParent;
      }

      var pixelVal = xPos - sliderX - this.scale/2;
      var newValue = Math.round((pixelVal / this.getPixelPerVal()) + this.minVal);

      if (this.activeDrag === "dLow")
      {
        if (newValue < this.minVal)                               newValue = this.minVal;
        if (newValue > this.valueRange.dangerHigh - thumb_spacer) newValue = this.valueRange.dangerHigh - thumb_spacer;
        this.valueRange.dangerLow = newValue;
      }
      else if (this.activeDrag === "wLow")
      {
        if (newValue < this.valueRange.dangerLow)                  newValue = this.valueRange.dangerLow;
        if (newValue > this.valueRange.warningHigh - thumb_spacer) newValue = this.valueRange.warningHigh - thumb_spacer;
        this.valueRange.warningLow = newValue;
      }
      else if (this.activeDrag === "wHigh")
      {
        if (newValue < this.valueRange.warningLow + thumb_spacer) newValue = this.valueRange.warningLow + thumb_spacer;
        if (newValue > this.valueRange.dangerHigh)                newValue = this.valueRange.dangerHigh;
        this.valueRange.warningHigh = newValue;
      }
      else if (this.activeDrag === "dHigh")
      {
        if (newValue < this.valueRange.dangerLow + thumb_spacer)  newValue = this.valueRange.dangerLow + thumb_spacer;
        if (newValue > this.maxVal)                               newValue = this.maxVal;
        this.valueRange.dangerHigh = newValue;
      }

      if (this.valueRange.dangerLow > this.valueRange.warningLow)
      {
        this.valueRange.warningLow = this.valueRange.dangerLow;
      }

      if (this.valueRange.warningHigh < this.valueRange.warningLow + thumb_spacer)
      {
        this.valueRange.warningHigh = this.valueRange.warningLow + thumb_spacer;
      }

      if (this.valueRange.dangerHigh < this.valueRange.warningHigh)
      {
        this.valueRange.warningHigh = this.valueRange.dangerHigh;
      }

      //this.updateSlider();
    }

    getThumbLabelStyle(type: string)
    {
      var style = 
      {
        "width": this.unitLabel.length + 3 + "ch"
      };

      if (type === 'warning')
      {
        style['color'] = warningColor;
      }
      else
      {
        style['color'] = dangerColor;
      }
      return style;
    }

    getSliderStyle()
    {
      var style = 
      {
        "border-radius": this.scale/2 + "px",
        "width": "100%",
        "height": this.scale + "px"
      }
      return style;
    }

    createThumbStyle(): object
    {
      var thumbWidth = (this.scale/2);
      var style =
      {
        "width": thumbWidth + "px",
        "height": (this.scale * 2) + "px",
        "border-radius": thumbWidth + "px",
      };
      return style;
    }

    createThumbPosition(type: string)
    {
      var style =
      {
        "left": this.getThumbPixelX(type) + "px",
        "z-index": 100
      };
      return style;
    }

    handleResize(event)
    {
      this.canvas.nativeElement.width = this.canvas.nativeElement.offsetWidth;
      this.updateSlider();
    }
}
