# TypeScript MCP Server 보일러플레이트

TypeScript MCP SDK를 활용하여 Model Context Protocol (MCP) 서버를 빠르게 개발할 수 있는 보일러플레이트 프로젝트입니다.

## 📁 프로젝트 구조

```
typescript-mcp-server-boilerplate/
├── src/
│   └── index.ts          # MCP 서버 메인 진입점
├── build/                # 컴파일된 JavaScript 파일 (빌드 후 생성)
├── package.json          # 프로젝트 의존성 및 스크립트
├── tsconfig.json         # TypeScript 설정
└── README.md            # 프로젝트 문서
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 서버 이름 설정

`src/index.ts` 파일에서 서버 이름을 수정하세요:

```typescript
const server = new McpServer({
    name: 'typescript-mcp-server', // 여기를 원하는 서버 이름으로 변경
    version: '1.0.0',
    // 활성화 하고자 하는 기능 설정
    capabilities: {
        tools: {},
        resources: {}
    }
})
```

> 💡 **팁**: 현재 보일러플레이트에는 이미 계산기와 인사 도구, 그리고 서버 정보 리소스가 예시로 구현되어 있습니다.

### 3. 빌드

```bash
npm run build
```

### 4. 실행

```bash
node build/index.js
```

빌드가 성공하면 `build/` 디렉토리에 컴파일된 JavaScript 파일이 생성되고, 서버가 MCP 클라이언트의 연결을 대기합니다.

## 🛠️ 개발 가이드

### MCP 도구(Tool) 추가하기

MCP 서버에 새로운 도구를 추가하려면 `server.tool()` 메서드에 **Zod 스키마를 직접** 정의하여 등록합니다:

```typescript
import { z } from 'zod'

// 계산기 도구 추가
server.tool(
    'calculator',
    {
        operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('수행할 연산 (add, subtract, multiply, divide)'),
        a: z.number().describe('첫 번째 숫자'),
        b: z.number().describe('두 번째 숫자')
    },
    async ({ operation, a, b }) => {
        // 연산 수행
        let result: number
        switch (operation) {
            case 'add':
                result = a + b
                break
            case 'subtract':
                result = a - b
                break
            case 'multiply':
                result = a * b
                break
            case 'divide':
                if (b === 0) throw new Error('0으로 나눌 수 없습니다')
                result = a / b
                break
            default:
                throw new Error('지원하지 않는 연산입니다')
        }

        const operationSymbols = {
            add: '+',
            subtract: '-',
            multiply: '×',
            divide: '÷'
        } as const

        const operationSymbol =
            operationSymbols[operation as keyof typeof operationSymbols]

        return {
            content: [
                {
                    type: 'text',
                    text: `${a} ${operationSymbol} ${b} = ${result}`
                }
            ]
        }
    }
)
```

#### 더 복잡한 도구 예시

```typescript
// 날씨 정보 조회 도구
server.tool(
    'get_weather',
    {
        city: z.string().describe('날씨를 조회할 도시명'),
        unit: z
            .enum(['celsius', 'fahrenheit'])
            .optional()
            .default('celsius')
            .describe('온도 단위 (기본값: celsius)')
    },
    async ({ city, unit }) => {
        try {
            // 실제 날씨 API 호출 로직 (예시)
            const weatherData = await fetchWeatherData(city, unit)

            return {
                content: [
                    {
                        type: 'text',
                        text: `${city}의 현재 날씨:
온도: ${weatherData.temperature}°${unit === 'celsius' ? 'C' : 'F'}
날씨: ${weatherData.condition}
습도: ${weatherData.humidity}%
풍속: ${weatherData.windSpeed}km/h`
                    }
                ]
            }
        } catch (error) {
            throw new Error(
                `날씨 정보를 가져올 수 없습니다: ${(error as Error).message}`
            )
        }
    }
)

// 도우미 함수
async function fetchWeatherData(city: string, unit: string) {
    // 실제 날씨 API 호출 구현
    // 여기서는 예시 데이터 반환
    return {
        temperature: unit === 'celsius' ? 22 : 72,
        condition: '맑음',
        humidity: 65,
        windSpeed: 12
    }
}
```

### 리소스 추가하기

MCP 서버에 리소스를 추가하여 외부 데이터나 파일에 대한 접근을 제공할 수 있습니다:

```typescript
// 리소스 등록
server.resource(
    'example-file',
    'file://example.txt',
    {
        name: '예시 텍스트 파일',
        description: '예시 텍스트 파일 설명',
        mimeType: 'text/plain'
    },
    async () => {
        return {
            contents: [
                {
                    uri: 'file://example.txt',
                    mimeType: 'text/plain',
                    text: '예시 파일 내용입니다.'
                }
            ]
        }
    }
)

// 동적 리소스 예시
server.resource(
    'app-settings',
    'config://settings',
    {
        name: '애플리케이션 설정',
        description: '애플리케이션의 현재 설정 정보',
        mimeType: 'application/json'
    },
    async () => {
        const settings = {
            theme: 'dark',
            language: 'ko-KR',
            notifications: true,
            lastUpdated: new Date().toISOString()
        }

        return {
            contents: [
                {
                    uri: 'config://settings',
                    mimeType: 'application/json',
                    text: JSON.stringify(settings, null, 2)
                }
            ]
        }
    }
)
```

## 📦 주요 의존성

- **@modelcontextprotocol/sdk**: MCP 프로토콜 구현을 위한 공식 SDK
- **zod**: TypeScript 우선 스키마 검증 라이브러리
- **typescript**: TypeScript 컴파일러

## 🔧 스크립트

- `npm run build`: TypeScript를 JavaScript로 컴파일하고 실행 권한 설정

## 📋 사용 예시

### 완전한 서버 예시

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// 서버 생성
const server = new McpServer({
    name: 'my-mcp-server',
    version: '1.0.0',
    capabilities: {
        tools: {},
        resources: {}
    }
})

// 간단한 인사 도구
server.tool(
    'greet',
    {
        name: z.string().describe('인사할 사람의 이름'),
        language: z
            .enum(['ko', 'en'])
            .optional()
            .default('ko')
            .describe('인사 언어 (기본값: ko)')
    },
    async ({ name, language }) => {
        const greeting =
            language === 'ko' ? `안녕하세요, ${name}님!` : `Hello, ${name}!`

        return {
            content: [
                {
                    type: 'text',
                    text: greeting
                }
            ]
        }
    }
)

// 시스템 정보 리소스
server.resource(
    'system-info',
    'system://info',
    {
        name: '시스템 정보',
        description: '서버의 현재 상태 및 시스템 정보',
        mimeType: 'application/json'
    },
    async () => {
        const systemInfo = {
            server: 'my-mcp-server',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }

        return {
            contents: [
                {
                    uri: 'system://info',
                    mimeType: 'application/json',
                    text: JSON.stringify(systemInfo, null, 2)
                }
            ]
        }
    }
)

// 서버 시작
async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('MCP 서버가 시작되었습니다')
}

main().catch(console.error)
```

## 🔧 Cursor MCP 연결

개발한 MCP 서버를 Cursor에서 테스트할 수 있습니다:

### 설정 파일 수정

`./.cursor/mcp.json` 파일을 편집합니다:

```json
{
    "mcpServers": {
        "typescript-mcp-server": {
            "command": "node",
            "args": ["/ABSOLUTE/PATH/TO/YOUR/PROJECT/build/index.js"]
        }
    }
}
```

> **주의**: 절대 경로를 사용해야 합니다. `pwd` 명령어로 현재 경로를 확인하세요.

### 테스트 명령어

Cursor MCP에서 다음과 같이 테스트해볼 수 있습니다:

- "5 더하기 3은 얼마야?" (계산기 도구 테스트)
- "안녕하세요 라고 인사해줘" (인사 도구 테스트)
- 서버 정보 리소스 조회

## 🔗 참고 자료

- [Model Context Protocol 공식 문서](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Node.js MCP 서버 개발 가이드](https://modelcontextprotocol.io/docs/develop/build-server#node)
- [Zod 문서](https://zod.dev/)

## 📄 라이선스

MIT
