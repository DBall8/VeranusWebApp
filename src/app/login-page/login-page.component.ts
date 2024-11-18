import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service'

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent implements OnInit {

  @ViewChild('Username', {static: false})         usernameField: ElementRef;
  @ViewChild('Password', {static: false})         passwordField: ElementRef;
  @ViewChild('ConfirmPassword', {static: false})  confirmPasswordField: ElementRef;

  newUser: boolean;
  showError: boolean;
  errorMessage: string;

  constructor(private loginService: LoginService, private router: Router) {
    this.newUser = false;
    this.showError = false;
    this.errorMessage = 'test';
  }

  ngOnInit() {
  }

  submit()
  {
    if (this.newUser)
    {
      this.attemptNewUser();
    }
    else
    {
      this.attemptLogin();
    }
  }

  attemptLogin()
  {
    var username: string = this.usernameField.nativeElement.value;
    var password: string = this.passwordField.nativeElement.value;

    // Trim whitespace
    username = username.trim();

    if (!username)
    {
      this.showErrorMessage("Please enter a username");
    }
    else if (!password)
    {
      this.showErrorMessage("Please enter a password");
    }
    else
    {
      this.loginService.login(username, password).subscribe((res: any) =>
      {
        if (!res || !res.body)
        {
          // Missing response
          this.showErrorMessage("Problem communicating with server");
        }
        else
        {
          if (res.body.success)
          {
            // Successful!
            this.router.navigate(['/']);
          }
          else
          {
            if (res.body.reason)
            {
              // Show the server's reason for failing this attempt
              this.showErrorMessage(res.body.reason);
            }
            else
            {
              // Server failed to send correct response
              this.showErrorMessage("Internal server error");
            }
          }
        }
      })
    }
  }

  attemptNewUser()
  {
    var username: string = this.usernameField.nativeElement.value;
    var password: string = this.passwordField.nativeElement.value;
    var confirmPassword: string = this.confirmPasswordField.nativeElement.value;

    // Trim whitespace
    username = username.trim();

    if (!username)
    {
      this.showErrorMessage("Please enter a username");
    }
    else if (!password)
    {
      this.showErrorMessage("Please enter a password");
    }
    else if (!confirmPassword)
    {
      this.showErrorMessage("Please confirm your password");
    }
    else if (password !== confirmPassword)
    {
      this.showErrorMessage("Passwords do not match");
    }
    else
    {
      this.loginService.newUser(username, password).subscribe((res: any) =>
      {
        if (!res || !res.body)
        {
          // Missing response
          this.showErrorMessage("Problem communicating with server");
        }
        else
        {
          if (res.body.success)
          {
            // Successful!
            this.router.navigate(['/']);
          }
          else
          {
            if (res.body.reason)
            {
              // Show the server's reason for failing this attempt
              this.showErrorMessage(res.body.reason);
            }
            else
            {
              // Server failed to send correct response
              this.showErrorMessage("Internal server error");
            }
          }
        }
      });
    }
  }

  showErrorMessage(msg: string)
  {
    this.errorMessage = msg;
    this.showError = true;

    this.passwordField.nativeElement.value = '';
    this.confirmPasswordField.nativeElement.value = '';
  }

  hideErrorMessage()
  {
    this.showError = false;
  }
}
