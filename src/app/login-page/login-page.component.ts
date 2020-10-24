import { Component, OnInit } from '@angular/core';
import { Router, RouteReuseStrategy } from '@angular/router';
import { LoginService } from '../services/login.service'

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent implements OnInit {

  newUser: boolean;

  constructor(private loginService: LoginService, private router: Router) {
    this.newUser = false;
  }

  ngOnInit() {
  }

  attemptLogin(username: string, password: string)
  {
    console.log("User: " + username + " Pass: " + password);
    this.loginService.login(username, password).subscribe((res: any) =>
    {
      console.log(res);
    })
  }

  attemptNewUser(username: string, password: string, confirmPassword: string)
  {
    console.log("User: " + username);
    console.log("Pass: " + password);
    console.log("Confirm: " + confirmPassword);
    this.loginService.newUser(username, password).subscribe((res: any) =>
    {
      console.log(res);
      this.router.navigate(['/']);
    });
  }
}
