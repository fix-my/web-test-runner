# @fixmyhome/test-runner

Jest 호환 API를 제공하는 경량 테스트 러너 패키지입니다.

## 주요 기능

- `describe()`: 테스트 그룹 정의
- `it()`: 개별 테스트 케이스 정의
- `expect()`: 단언(assertion) 함수
- `runTests()`: 테스트 실행 및 결과 반환

## 사용 예시

```typescript
import { describe, it, expect, runTests } from '@fixmyhome/test-runner';

describe('Button Component', () => {
  it('should be clickable', () => {
    const button = document.querySelector('button');
    expect(button).toBeTruthy();
  });
});

const result = await runTests();
console.log(result);
```
