import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { InferenceClient } from '@huggingface/inference'
import dotenv from 'dotenv'
dotenv.config()

export default function createServer() {
    // 서버 인스턴스 생성
    const server = new McpServer({
        name: 'typescript-mcp-server',
        version: '1.0.0',
        capabilities: {
            tools: {},
            resources: {},
            prompts: {}
        }
    })

    // 예시 도구: 인사하기
    server.tool(
        'greeting',
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
    )

    // 예시 도구: 계산기
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

    // 예시 도구: 시간 조회
    server.tool(
        'get_time',
        {
            timeZone: z.string().describe('시간대')
        },
        async ({ timeZone }) => {
            return {
                content: [
                    {
                        type: 'text',
                        text: new Date().toLocaleString('ko-KR', {
                            timeZone
                        })
                    }
                ]
            }
        }
    )

    // 이미지 생성 도구
    server.tool(
        'generate_image',
        {
            prompt: z.string().describe('이미지 생성을 위한 프롬프트')
        },
        async ({ prompt }) => {
            try {
                // Hugging Face 토큰 확인
                if (!process.env.HF_TOKEN) {
                    throw new Error('HF_TOKEN 환경변수가 설정되지 않았습니다')
                }

                // Hugging Face Inference 클라이언트 생성
                const client = new InferenceClient(process.env.HF_TOKEN)

                // 이미지 생성 요청
                const imageBlob = await client.textToImage({
                    provider: 'fal-ai',
                    model: 'black-forest-labs/FLUX.1-schnell',
                    inputs: prompt,
                    parameters: { num_inference_steps: 5 }
                })

                // Blob을 ArrayBuffer로 변환 후 base64 인코딩
                const arrayBuffer = await (
                    imageBlob as unknown as Blob
                ).arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                const base64Data = buffer.toString('base64')

                return {
                    content: [
                        {
                            type: 'image',
                            data: base64Data,
                            mimeType: 'image/png'
                        }
                    ],
                    annotations: {
                        audience: ['user'],
                        priority: 0.9
                    }
                }
            } catch (error) {
                throw new Error(
                    `이미지 생성 중 오류가 발생했습니다: ${
                        error instanceof Error
                            ? error.message
                            : '알 수 없는 오류'
                    }`
                )
            }
        }
    )

    // 예시 리소스: 서버 정보
    server.resource(
        'server://info',
        'server://info',
        {
            name: '서버 정보',
            description: 'TypeScript MCP Server 보일러플레이트 정보',
            mimeType: 'application/json'
        },
        async () => {
            const serverInfo = {
                name: 'typescript-mcp-server',
                version: '1.0.0',
                description: 'TypeScript MCP Server 보일러플레이트',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                nodeVersion: process.version,
                platform: process.platform
            }

            return {
                contents: [
                    {
                        uri: 'server://info',
                        mimeType: 'application/json',
                        text: JSON.stringify(serverInfo, null, 2)
                    }
                ]
            }
        }
    )

    // 예시 프롬프트: 코드 리뷰
    server.prompt(
        'code_review',
        'Request Code Review',
        {
            code: z.string().describe('The code to review')
        },
        async ({ code }) => {
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `다음 코드를 분석하고 상세한 리뷰를 제공해주세요:\n\n1. 코드 품질 평가\n2. 개선 가능한 부분\n3. 모범 사례 권장사항\n4. 보안 고려사항\n\n리뷰할 코드:\n\n\`\`\`\n${code}\n\`\`\``
                        }
                    }
                ]
            }
        }
    )

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

    return server.server
}
