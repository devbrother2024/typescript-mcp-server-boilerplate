import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// 서버 인스턴스 생성
const server = new McpServer({
    name: 'my-mcp-server',
    version: '1.0.0'
})

server.registerTool(
    'greet',
    {
        description: '이름과 언어를 입력하면 인사말을 반환합니다.',
        inputSchema: z.object({
            name: z.string().describe('인사할 사람의 이름'),
            language: z
                .enum(['ko', 'en'])
                .optional()
                .default('en')
                .describe('인사 언어 (기본값: en)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('인사말')
                    })
                )
                .describe('인사말')
        })
    },
    async ({ name, language }) => {
        const greeting =
            language === 'ko'
                ? `안녕하세요, ${name}님!`
                : `Hey there, ${name}! 👋 Nice to meet you!`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: greeting
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: greeting
                    }
                ]
            }
        }
    }
)

server
    .connect(new StdioServerTransport())
    .catch(console.error)
    .then(() => {
        console.log('MCP server started')
    })
