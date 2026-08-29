import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="home-copy">
        <span className="eyebrow">MY HOME · ROOM STUDIO</span>
        <h1>把户型图，变成<br /><em>真正的小屋。</em></h1>
        <p>上传或绘制你的户型，调整墙体与空间尺寸，再进入 3D 小屋查看真实空间。</p>
        <Link className="home-primary-action" to="/floorplan">
          通过户型图创建小屋 <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="home-preview" aria-hidden="true">
        <div className="home-preview-card">
          <span className="preview-label">YOUR NEXT SPACE</span>
          <div className="preview-plan">
            <span className="preview-room preview-room-main">客厅</span>
            <span className="preview-room preview-room-side">卧室</span>
            <span className="preview-room preview-room-small">厨房</span>
          </div>
        </div>
      </div>
    </section>
  )
}
