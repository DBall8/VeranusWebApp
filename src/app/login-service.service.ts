import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<any>
  {
    return this.http.request(
      "POST",
      "/login",
      {
        observe: 'response',
        body:
        {
          username: username,
          password: password
        }
      }
    )
  }
}
