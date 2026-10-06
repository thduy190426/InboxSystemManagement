import i18n from '../../i18n'
export type Sticker = {
  id: string
  url: string
}

export type StickerPack = {
  id: string
  name: string
  icon: string
  stickers: Sticker[]
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'pack_pusheen',
    name: 'Pusheen',
    icon: 'https://i.pinimg.com/originals/a1/9f/8e/a19f8e4e75d71c4c8ba713093b163d8d.png',
    stickers: [
      { id: 'pusheen_1', url: 'https://i.pinimg.com/originals/a1/9f/8e/a19f8e4e75d71c4c8ba713093b163d8d.png' },
      { id: 'pusheen_2', url: 'https://i.pinimg.com/originals/d6/33/df/d633df7164ff89659b32943e2e50523e.gif' },
      { id: 'pusheen_3', url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z0OG95cTF6bDZpeHFxZDB1aTJoZnIybGVxaXl4MzF5NnRqOWI5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Lq0h93752f6J9tijrh/giphy.webp' },
      { id: 'pusheen_4', url: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3RtbmliMnNqaXhxMGszbnV5Ym5xd2E3ZXZxaDAxb3cyaTFtdHZtaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kFgzrTt798d2w/giphy.webp' }
    ]
  },
  {
    id: 'pack_pepe',
    name: 'Pepe',
    icon: 'https://upload.wikimedia.org/wikipedia/en/8/86/Pepe_the_Frog.png',
    stickers: [
      { id: 'pepe_1', url: 'https://upload.wikimedia.org/wikipedia/en/8/86/Pepe_the_Frog.png' },
      { id: 'pepe_2', url: 'https://e7.pngegg.com/pngimages/111/501/png-clipart-pepe-the-frog-internet-meme-pepe-frog-animals-vertebrate-thumbnail.png' },
      { id: 'pepe_3', url: 'https://media1.tenor.com/m/P-jV1d_fG7AAAAAd/pepe-sad.gif' },
      { id: 'pepe_4', url: 'https://media1.tenor.com/m/m6B_2d7E_7EAAAAd/pepe-dance.gif' }
    ]
  }
]

export async function fetchStickerPacks(): Promise<StickerPack[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(STICKER_PACKS)
    }, 300)
  })
}
