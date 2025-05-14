import http from 'k6/http';
import { sleep } from 'k6';

export default function () {
  http.get('https://staging-chief.nexcloud.id/');
  sleep(1);
}
