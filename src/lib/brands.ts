export enum Brand {
  musora = 'musora',
  drumeo = 'drumeo',
  pianote = 'pianote',
  guitareo = 'guitareo',
  singeo = 'singeo',
  playbass = 'playbass',
}

export type Brands = keyof typeof Brand
