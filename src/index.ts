import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js'

// 서버 인스턴스 생성
const server = new Server(
    {
        name: 'typescript-mcp-server',
        version: '1.0.0'
    },
    {
        capabilities: {
            tools: {}
        }
    }
)

// 도구 목록 요청 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'greeting',
                description: '지정된 언어로 인사를 생성합니다',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: '인사할 사람의 이름'
                        },
                        language: {
                            type: 'string',
                            enum: ['ko', 'en'],
                            default: 'ko',
                            description: '인사 언어 (기본값: ko)'
                        }
                    },
                    required: ['name']
                }
            }
        ]
    }
})

// 도구 호출 요청 핸들러
server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name: toolName, arguments: args } = request.params

    if (toolName === 'greeting') {
        const { name, language = 'ko' } = args as {
            name: string
            language?: 'ko' | 'en'
        }

        const greeting =
            language === 'ko'
                ? `안녕하세요, ${name}님! 😊`
                : `Hello, ${name}! 👋`

        return {
            content: [
                {
                    type: 'text',
                    text: greeting
                }
            ]
        }
    }

    throw new Error(`알 수 없는 도구: ${toolName}`)
})

// 서버 시작
async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('TypeScript MCP 서버가 시작되었습니다!')
}

main().catch(error => {
    console.error('서버 시작 중 오류 발생:', error)
    process.exit(1)
})
